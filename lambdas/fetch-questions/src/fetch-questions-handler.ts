import { SQSClient } from "@aws-sdk/client-sqs";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { fromEnv } from "@aws-sdk/credential-providers";

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
import { FetchQuestionInputs } from "./types/fetch-question-types";
import { AuditService } from "../../../lib/src/Service/audit-service";
import { CriAuditConfig } from "../../../lib/src/types/cri-audit-config";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../lib/src/types/audit-event";

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
  auditService: AuditService;
  sqsQueueUrl: string | undefined;

  constructor(
    metricsProbe: MetricsProbe,
    questionsRetrievalService: QuestionsRetrievalService,
    saveQuestionsService: SaveQuestionsService,
    filterQuestionsService: FilterQuestionsService,
    auditService: AuditService,
    sqsQueueUrl: string | undefined
  ) {
    this.metricsProbe = metricsProbe;
    this.questionsRetrievalService = questionsRetrievalService;
    this.saveQuestionsService = saveQuestionsService;
    this.filterQuestionsService = filterQuestionsService;
    this.auditService = auditService;
    this.sqsQueueUrl = sqsQueueUrl;
  }
  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logger.info("handler start");

      // Safely retrieve lambda inputs
      const inputs: FetchQuestionInputs =
        this.safeRetrieveLambdaEventInputs(event);

      const sessionItem = inputs.sessionItem;

      logger.debug(
        `Event inputs - sessionId:${inputs.sessionId}, questionsUrl:${inputs.questionsUrl}, userAgent:${inputs.userAgent}, token:${inputs.bearerToken}, nino:${inputs.nino},`
      );

      let fetchQuestionsState: FetchQuestionsState =
        FetchQuestionsState.InsufficientQuestions;

      // Look up questions table and see if already stored for this session/nino
      const existingSavedItem = (
        await this.saveQuestionsService.getExistingSavedItem(inputs.sessionId)
      )?.Item;
      const alreadyExistingQuestionsResult: boolean =
        existingSavedItem != undefined;
      logger.info(
        `Already existing questions result - ${alreadyExistingQuestionsResult}`
      );

      if (!alreadyExistingQuestionsResult) {
        const questionsResult: QuestionsResult =
          await this.questionsRetrievalService.retrieveQuestions(inputs);

        const correlationId = questionsResult.getCorrelationId();
        const questionResultCount: number = questionsResult.getQuestionCount();
        logger.info(
          `Result returned - correlationId : ${correlationId}, questionResultCount ${questionResultCount}`
        );

        logger.debug(
          `Retrieved Question keys returned for nino ${inputs.nino} / session ${
            inputs.sessionId
          } - ${JSON.stringify(questionsResult.questions)}`
        );

        logger.info("Filtering questions");
        const filteredQuestions: Question[] =
          await this.filterQuestionsService.filterQuestions(
            questionsResult.questions
          );
        logger.debug(
          `Filtered Question keys returned  for nino ${inputs.nino} / session ${
            inputs.sessionId
          } - ${JSON.stringify(filteredQuestions)}`
        );

        logger.info("Question keys have been filtered successfully");

        // Check filter outcome (questionResultCount placeholder)
        const filterQuestionsResultCount: number = filteredQuestions.length;
        if (filterQuestionsResultCount > 1) {
          fetchQuestionsState = FetchQuestionsState.SufficientQuestions;
        } else {
          //this is purely for audit events
          const hmrcIvqResponse: HmrcIvqResponse = {
            outcome: "InsufficientQuestions",
          };
          await this.auditService.sendAuditEvent(
            AuditEventType.THIN_FILE_ENCOUNTERED,
            sessionItem,
            undefined,
            undefined,
            hmrcIvqResponse
          );
        }

        // Save question keys to DynamoDB only if they pass filtering - other wise save an empty questions result
        const sessionTtl: number = inputs.sessionTtl;
        logger.info(`Saving questions ${inputs.sessionId} - ${sessionTtl}`);
        const questionsSaved = await this.saveQuestionsService.saveQuestions(
          inputs.sessionId,
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

  private safeRetrieveLambdaEventInputs(event: any): FetchQuestionInputs {
    const sessionId = event?.sessionId;

    const parameters = event?.parameters;
    const questionsUrl = event?.parameters?.url?.value;
    const userAgent = event?.parameters?.userAgent?.value;
    const bearerToken = event?.bearerToken?.value; // NOTE expiry is not checked as its not used currently

    const personIdentityItem = event?.personIdentityItem;
    const nino = event?.personIdentityItem?.nino;
    const sessionItem = event?.sessionItem;

    if (!event) {
      throw new Error("input event is empty");
    }

    if (!sessionId) {
      throw new Error("sessionId was not provided");
    }

    if (!parameters) {
      throw new Error("event parameters not found");
    }

    if (!questionsUrl) {
      throw new Error("questionsUrl was not provided");
    }

    if (!userAgent) {
      throw new Error("userAgent was not provided");
    }

    if (!bearerToken) {
      throw new Error("bearerToken was not provided");
    }

    if (!personIdentityItem) {
      throw new Error("personIdentityItem not found");
    }

    if (!nino) {
      throw new Error("nino was not provided");
    }

    if (!sessionItem) {
      throw new Error("Session item was not provided");
    } else {
      try {
        this.validateSessionItem(sessionItem);
      } catch (error: any) {
        const errorText: string = error.message;

        throw new Error(`Session item was malformed : ${errorText}`);
      }
    }

    // Now save to use this
    const sessionTtl = event.sessionItem.Item.expiryDate.N;

    return {
      sessionId: sessionId,
      sessionTtl: Number(sessionTtl),
      questionsUrl: questionsUrl,
      userAgent: userAgent,
      bearerToken: bearerToken,
      nino: nino,
      sessionItem: sessionItem,
    } as FetchQuestionInputs;
  }

  private validateSessionItem(sessionItem: any) {
    const item = sessionItem?.Item;

    const sessionId = item?.sessionId?.S;
    const expiryDate = item?.expiryDate?.N;
    const clientIpAddress = item?.clientIpAddress?.S;
    const redirectUri = item?.redirectUri?.S;
    const clientSessionId = item?.clientSessionId?.S;
    const createdDate = item?.createdDate?.N;
    const clientId = item?.clientId?.S;
    const persistentSessionId = item?.persistentSessionId?.S;
    const attemptCount = item?.attemptCount?.N;
    const state = item?.state?.S;
    const subject = item?.subject?.S;

    if (!item) {
      throw new Error("Session item missing Item");
    }

    if (!sessionId) {
      throw new Error("Session item missing sessionId");
    }

    if (!expiryDate) {
      throw new Error("Session item missing expiryDate");
    }

    if (!clientIpAddress) {
      throw new Error("Session item missing clientIpAddress");
    }

    if (!redirectUri) {
      throw new Error("Session item missing redirectUri");
    }

    if (!clientSessionId) {
      throw new Error("Session item missing clientSessionId");
    }

    if (!createdDate) {
      throw new Error("Session item missing createdDate");
    }

    if (!clientId) {
      throw new Error("Session item missing clientId");
    }

    if (!persistentSessionId) {
      throw new Error("Session item missing persistentSessionId");
    }

    if (!attemptCount) {
      throw new Error("Session item missing attemptCount");
    }

    if (!state) {
      throw new Error("Session item missing state");
    }

    if (!subject) {
      throw new Error("Session item missing subject");
    }
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
const issuer = "verifiable-credential/issuer";
const criAuditConfig: CriAuditConfig = {
  queueUrl,
  issuer,
};

const auditService: AuditService = new AuditService(
  () => criAuditConfig,
  new SQSClient({
    region: "eu-west-2",
    credentials: fromEnv(),
  })
);
const handlerClass = new FetchQuestionsHandler(
  metricProbe,
  new QuestionsRetrievalService(metricProbe, auditService),
  new SaveQuestionsService(createDynamoDbClient()),
  new FilterQuestionsService(metricProbe),
  auditService,
  queueUrl
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
