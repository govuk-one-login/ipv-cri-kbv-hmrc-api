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

import {
  PersonIdentityItem,
  SessionItem,
} from "../../../lib/src/types/common-types";

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
import { SqsAuditClient } from "../../../lib/src/Service/sqs-audit-client";

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
      const nino =
        inputs.personIdentityItem?.socialSecurityRecord?.[0]?.personalNumber;

      logger.debug(
        `Event inputs - sessionId:${inputs.sessionId}, questionsUrl:${inputs.questionsUrl}, userAgent:${inputs.userAgent}, token:${inputs.bearerToken}, nino:${nino},`
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
          `Retrieved Question keys returned for nino ${nino} / session ${
            inputs.sessionId
          } - ${JSON.stringify(questionsResult.questions)}`
        );

        logger.info("Filtering questions");
        const filteredQuestions: Question[] =
          await this.filterQuestionsService.filterQuestions(
            questionsResult.questions
          );
        logger.debug(
          `Filtered Question keys returned  for nino ${nino} / session ${
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
            hmrcIvqResponse,
            inputs.issuer
          );
        }

        // Save question keys to DynamoDB only if they pass filtering - other wise save an empty questions result
        const sessionExpiryDate: number = inputs.sessionItem.expiryDate;
        logger.info(
          `Saving questions ${inputs.sessionId} - ${sessionExpiryDate}`
        );
        const questionsSaved = await this.saveQuestionsService.saveQuestions(
          inputs.sessionId,
          sessionExpiryDate,
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
    const issuer = event?.parameters?.issuer?.value;
    const bearerToken = event?.bearerToken?.value; // NOTE expiry is not checked as its not used currently

    const personIdentityItem = event?.personIdentityItem;
    const nino =
      event?.personIdentityItem?.socialSecurityRecord?.[0]?.personalNumber;
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

    if (!issuer) {
      throw new Error("issuer was not provided");
    }

    if (!bearerToken) {
      throw new Error("bearerToken was not provided");
    }

    if (!sessionItem) {
      throw new Error("Session item was not provided");
    } else {
      try {
        this.validateUnmarshalledSessionItem(sessionItem);
      } catch (error: any) {
        const errorText: string = error.message;

        throw new Error(`Session item was malformed : ${errorText}`);
      }

      if (!personIdentityItem) {
        throw new Error("personIdentityItem not found");
      }

      if (!nino) {
        throw new Error("nino was not provided");
      }
    }

    return {
      sessionId: sessionId,
      questionsUrl: questionsUrl,
      userAgent: userAgent,
      issuer: issuer,
      bearerToken: bearerToken,
      personIdentityItem: personIdentityItem as PersonIdentityItem,
      sessionItem: sessionItem as SessionItem,
    } as FetchQuestionInputs;
  }

  private validateUnmarshalledSessionItem(sessionItem: any) {
    if (Object.keys(sessionItem).length === 0) {
      throw new Error("Session item is empty");
    }

    if (!sessionItem.sessionId) {
      throw new Error("Session item missing sessionId");
    }

    if (!sessionItem.expiryDate) {
      throw new Error("Session item missing expiryDate");
    }

    if (!sessionItem.clientIpAddress) {
      throw new Error("Session item missing clientIpAddress");
    }

    if (!sessionItem.redirectUri) {
      throw new Error("Session item missing redirectUri");
    }

    if (!sessionItem.clientSessionId) {
      throw new Error("Session item missing clientSessionId");
    }

    if (!sessionItem.createdDate) {
      throw new Error("Session item missing createdDate");
    }

    if (!sessionItem.clientId) {
      throw new Error("Session item missing clientId");
    }

    if (!sessionItem.persistentSessionId) {
      throw new Error("Session item missing persistentSessionId");
    }

    if (!sessionItem.attemptCount && sessionItem.attemptCount != 0) {
      throw new Error("Session item missing attemptCount");
    }

    if (!sessionItem.state) {
      throw new Error("Session item missing state");
    }

    if (!sessionItem.subject) {
      throw new Error("Session item missing subject");
    }
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
const criAuditConfig: CriAuditConfig = {
  queueUrl,
};

const auditService: AuditService = new AuditService(
  new SqsAuditClient(
    () => criAuditConfig,
    new SQSClient({
      region: "eu-west-2",
      credentials: fromEnv(),
    })
  )
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
