import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { QuestionsRetrievalService } from "./services/questions-retrieval-service";
import { QuestionsResult } from "./types/questions-result-types";

const logger = new Logger({ serviceName: "FetchQuestionsHandler" });

export class FetchQuestionsHandler implements LambdaInterface {
  metricProbe: MetricsProbe;
  questionsRetrievalService: QuestionsRetrievalService;

  constructor(
    metricProbe: MetricsProbe,
    questionsRetrievalService: QuestionsRetrievalService
  ) {
    this.metricProbe = metricProbe;
    this.questionsRetrievalService = questionsRetrievalService;
  }

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logger.info("handler start");

      const questionsResult: QuestionsResult =
        await this.questionsRetrievalService.retrieveQuestions(event);

      const correlationId: string = questionsResult.getCorrelationId();
      const questionCount: number = questionsResult.getQuestionCount();

      logger.info(
        `Result returned - correlationId : ${correlationId}, questionCount ${questionCount}`
      );

      // Request sent audit event
      // Response recieved audit event
      // TBD if placed in handler or questionsRetrievalService

      // Next
      // TBD Save question count/keys to DynamoDB (even if not enough)

      metricProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnits.Count,
        CompletionStatus.OK
      );

      // A simple json object with the questionCount
      return { availableQuestions: `${questionCount}` };
    } catch (error: any) {
      const lambdaName = FetchQuestionsHandler.name;
      const errorText: string = error.message;

      const errorMessage = `${lambdaName} : ${errorText}`;

      logger.error(errorMessage);

      metricProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnits.Count,
        CompletionStatus.ERROR
      );

      return { error: errorMessage };
    }
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const handlerClass = new FetchQuestionsHandler(
  metricProbe,
  new QuestionsRetrievalService(metricProbe)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
