import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { QuestionsRetrievalService } from "./services/questions-retrieval-service";
import { QuestionsResult, Question } from "./types/questions-result-types";
import { SaveQuestionsService } from "./services/save-questions-service";
import { FilterQuestionsService } from "./services/filter-questions-service";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";

const logger = new Logger({ serviceName: "FetchQuestionsHandler" });

// NOTE: these strings are also used in the metric for the outcome
enum FetchQuestionsState {
  SufficientQuestions = "SufficientQuestions",
  ContinueSufficientQuestionAlreadyRetrieved = "ContinueSufficientQuestionAlreadyRetrieved",
  InsufficientQuestions = "InsufficientQuestions",
}

export class FetchQuestionsHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;
  questionsRetrievalService: QuestionsRetrievalService;
  saveQuestionsService: SaveQuestionsService;
  filterQuestionsService: FilterQuestionsService;

  constructor(
    metricsProbe: MetricsProbe,
    questionsRetrievalService: QuestionsRetrievalService,
    saveQuestionsService: SaveQuestionsService,
    filterQuestionsService: FilterQuestionsService
  ) {
    this.metricsProbe = metricsProbe;
    this.questionsRetrievalService = questionsRetrievalService;
    this.saveQuestionsService = saveQuestionsService;
    this.filterQuestionsService = filterQuestionsService;
  }

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logger.info("handler start");

      let fetchQuestionsState: FetchQuestionsState =
        FetchQuestionsState.InsufficientQuestions;

      // Look up questions table and see if already stored for this session/nino
      const existingSavedItem = (
        await this.saveQuestionsService.getExistingSavedItem(event.sessionId)
      )?.Item;
      const alreadyExistingQuestionsResult: boolean =
        existingSavedItem != undefined;
      logger.info(
        `Already existing questions result - ${alreadyExistingQuestionsResult}`
      );

      if (!alreadyExistingQuestionsResult) {
        const questionsResult: QuestionsResult =
          await this.questionsRetrievalService.retrieveQuestions(event);

        const correlationId = questionsResult.getCorrelationId();
        const questionResultCount: number = questionsResult.getQuestionCount();

        logger.info(
          `Result returned - correlationId : ${correlationId}, questionResultCount ${questionResultCount}`
        );

        // Request sent audit event
        // Response recieved audit event
        // TBD if placed in handler or questionsRetrievalService

        logger.info("Filtering questions");

        const filteredQuestions: Question[] =
          await this.filterQuestionsService.filterQuestions(
            questionsResult.questions
          );
        logger.info("Question keys have been filtered successfully");

        // Check filter outcome (questionResultCount placeholder)
        const filterQuestionsResultCount: number = filteredQuestions.length;
        if (filterQuestionsResultCount > 1) {
          fetchQuestionsState = FetchQuestionsState.SufficientQuestions;
        }

        // Save question keys to DynamoDB only if they pass filtering - other wise save an empty questions result
        const sessionTtl: number = Number(event.sessionItem.Item.expiryDate.N);
        logger.info(`Saving questions ${event.sessionId} - ${sessionTtl}`);
        const questionsSaved = await this.saveQuestionsService.saveQuestions(
          event.sessionId,
          sessionTtl,
          correlationId,
          filteredQuestions
        );
        logger.info("Questions have been saved " + questionsSaved);
      } else {
        // If the user arrives in fetch questions, with question keys already saved
        // We need to indicate to the front end if they can continue or not
        const existingQuestionsNonZero: boolean =
          existingSavedItem?.questions?.length;

        if (existingQuestionsNonZero) {
          logger.info(
            "Continue there are sufficient questions in the existing result NINO"
          );
          fetchQuestionsState =
            FetchQuestionsState.ContinueSufficientQuestionAlreadyRetrieved;
        } else {
          logger.info(
            "InsufficientQuestions in the existing result for this NINO"
          );
          fetchQuestionsState = FetchQuestionsState.InsufficientQuestions;
        }
      }

      this.metricsProbe.captureMetric(
        `${fetchQuestionsState}`,
        MetricUnit.Count,
        1
      );

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      // fetchQuestionsState is retuned to the state machine
      return { fetchQuestionsState: `${fetchQuestionsState}` };
    } catch (error: any) {
      const lambdaName = FetchQuestionsHandler.name;
      const errorText: string = error.message;

      const errorMessage = `${lambdaName} : ${errorText}`;
      logger.error(errorMessage);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      // Indicate to the statemachine a lambda error has occured
      return { error: errorMessage };
    }
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const handlerClass = new FetchQuestionsHandler(
  metricProbe,
  new QuestionsRetrievalService(metricProbe),
  new SaveQuestionsService(createDynamoDbClient()),
  new FilterQuestionsService(metricProbe)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
