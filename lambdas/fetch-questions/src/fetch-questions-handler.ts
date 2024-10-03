import { SQSClient } from "@aws-sdk/client-sqs";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
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
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

const logHelper = new LogHelper("FetchQuestionsHandler");

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
  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      // Safely retrieve lambda inputs
      const input: FetchQuestionInputs =
        this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      // Each has an internal logging that needs attached
      this.questionsRetrievalService.attachLogging(
        input.sessionItem,
        input.statemachine
      );
      this.filterQuestionsService.attachLogging(
        input.sessionItem,
        input.statemachine
      );
      this.saveQuestionsService.attachLogging(
        input.sessionItem,
        input.statemachine
      );
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const sessionItem = input.sessionItem;
      const nino =
        input.personIdentityItem?.socialSecurityRecord?.[0]?.personalNumber;

      logHelper.debug(
        `Event inputs - sessionId:${input.sessionItem.sessionId}, questionsUrl:${input.questionsUrl}, userAgent:${input.userAgent}, token:${input.bearerToken}, nino:${nino},`
      );

      let fetchQuestionsState: FetchQuestionsState =
        FetchQuestionsState.InsufficientQuestions;

      // Look up questions table and see if already stored for this session/nino
      const existingSavedItem = (
        await this.saveQuestionsService.getExistingSavedItem(
          input.sessionItem.sessionId
        )
      )?.Item;
      const alreadyExistingQuestionsResult: boolean =
        existingSavedItem != undefined;
      logHelper.info(
        `Already existing questions result - ${alreadyExistingQuestionsResult}`
      );

      if (!alreadyExistingQuestionsResult) {
        const questionsResult: QuestionsResult =
          await this.questionsRetrievalService.retrieveQuestions(input);

        const correlationId = questionsResult.getCorrelationId();
        const questionResultCount: number = questionsResult.getQuestionCount();
        logHelper.info(
          `Result returned - correlationId : ${correlationId}, questionResultCount ${questionResultCount}`
        );

        logHelper.debug(
          `Retrieved Question keys returned for nino ${nino} / session ${
            input.sessionItem.sessionId
          } - ${JSON.stringify(questionsResult.questions)}`
        );

        logHelper.info("Filtering questions");
        const filteredQuestions: Question[] =
          await this.filterQuestionsService.filterQuestions(
            questionsResult.questions
          );
        logHelper.debug(
          `Filtered Question keys returned  for nino ${nino} / session ${
            input.sessionItem.sessionId
          } - ${JSON.stringify(filteredQuestions)}`
        );

        logHelper.info("Question keys have been filtered successfully");

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
            input.issuer
          );
        }

        // Save question keys to DynamoDB only if they pass filtering - other wise save an empty questions result
        const sessionExpiryDate: number = input.sessionItem.expiryDate;
        logHelper.info(
          `Saving questions ${input.sessionItem.sessionId} - ${sessionExpiryDate}`
        );
        const questionsSaved = await this.saveQuestionsService.saveQuestions(
          input.sessionItem.sessionId,
          sessionExpiryDate,
          correlationId,
          filteredQuestions
        );
        logHelper.info("Questions have been saved " + questionsSaved);
      } else {
        // If the user arrives in fetch questions, with question keys already saved
        // We need to indicate to the front end if they can continue or not
        const existingQuestionsNonZero: boolean =
          existingSavedItem?.questions?.length;

        if (existingQuestionsNonZero) {
          logHelper.info(
            "Continue there are sufficient questions in the existing result NINO"
          );
          fetchQuestionsState =
            FetchQuestionsState.ContinueSufficientQuestionAlreadyRetrieved;
        } else {
          logHelper.info(
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
      logHelper.error(errorMessage);

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
    if (!event) {
      throw new Error("input event is empty");
    }

    // Parameters
    const parameters = event?.parameters;
    const questionsUrl = event?.parameters?.questionsUrl?.value;
    const userAgent = event?.parameters?.userAgent?.value;
    const issuer = event?.parameters?.issuer?.value;
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

    // OTG Token
    const bearerToken = event?.bearerToken?.value; // NOTE expiry is not checked as its not used currently
    if (!bearerToken) {
      throw new Error("bearerToken was not provided");
    }

    // Session - Will throw errors on failure
    const sessionItem = event.sessionItem;
    SharedInputsValidator.validateUnmarshalledSessionItem(event.sessionItem);

    // State machine values for logging
    const statemachine = event.statemachine;
    if (!statemachine) {
      throw new Error("Statemachine values not found");
    }

    const personIdentityItem = event?.personIdentityItem;
    if (!personIdentityItem) {
      throw new Error("personIdentityItem not found");
    }

    const nino =
      event?.personIdentityItem?.socialSecurityRecord?.[0]?.personalNumber;
    if (!nino) {
      throw new Error("nino was not provided");
    }

    return {
      sessionItem: sessionItem as SessionItem,
      statemachine: statemachine as Statemachine,
      personIdentityItem: personIdentityItem as PersonIdentityItem,
      bearerToken: bearerToken,
      questionsUrl: questionsUrl,
      userAgent: userAgent,
      issuer: issuer,
    } as FetchQuestionInputs;
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
