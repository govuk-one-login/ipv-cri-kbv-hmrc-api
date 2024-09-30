import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { ResultsService } from "./services/results-service";
import { SubmitAnswerService } from "./services/submit-answer-service";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";
import { SubmitAnswerResult } from "./types/answer-result-types";
import { VerificationScoreCalculator } from "./utils/verification-score-calculator";
import { CheckDetailsCountCalculator } from "./utils/check-details-count-calculator";
import { AuditService } from "../../../lib/src/Service/audit-service";
import { SqsAuditClient } from "../../../lib/src/Service/sqs-audit-client";
import { SQSClient } from "@aws-sdk/client-sqs";
import { fromEnv } from "@aws-sdk/credential-providers";
import { CriAuditConfig } from "../../../lib/src/types/cri-audit-config";
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";
import {
  SessionItem,
  PersonIdentityItem,
} from "../../../lib/src/types/common-types";
import { OTGToken } from "../../../lib/src/types/otg-token-types";
import {
  SavedAnswersItem,
  SubmitAnswerInputs,
} from "./types/submit-answer-types";

const logHelper = new LogHelper("SubmitAnswerHandler");
const verificationScoreCalculator = new VerificationScoreCalculator();
const checkDetailsCountCalculator = new CheckDetailsCountCalculator();

enum SubmitAnswerHandlerMetrics {
  VerificationScore = "VerificationScore",
}

export class SubmitAnswerHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;
  submitAnswerService: SubmitAnswerService;
  resultService: ResultsService;

  constructor(
    metricsProbe: MetricsProbe,
    submitAnswerService: SubmitAnswerService,
    saveAnswerResultService: ResultsService
  ) {
    this.metricsProbe = metricsProbe;
    this.submitAnswerService = submitAnswerService;
    this.resultService = saveAnswerResultService;
  }

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      // Safely retrieve lambda inputs
      const input: SubmitAnswerInputs =
        this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      this.submitAnswerService.attachLogging(
        input.sessionItem,
        input.statemachine
      );
      this.resultService.attachLogging(input.sessionItem, input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const answerResult: SubmitAnswerResult[] =
        await this.submitAnswerService.checkAnswers(
          input.sessionItem,
          input.nino,
          input.savedAnswersItem,
          input.parameters,
          input.otgToken
        );

      const verificationScore: number =
        verificationScoreCalculator.calculateVerificationScore(answerResult);

      const correctAnswerCount =
        checkDetailsCountCalculator.calculateAnswerCount(
          answerResult,
          "correct"
        );
      const incorrectAnswerCount =
        checkDetailsCountCalculator.calculateAnswerCount(
          answerResult,
          "incorrect"
        );

      await this.resultService.saveResults(
        input.sessionItem.sessionId,
        input.savedAnswersItem.correlationId,
        Number(input.sessionItem.expiryDate),
        answerResult,
        verificationScore,
        correctAnswerCount,
        incorrectAnswerCount
      );

      this.metricsProbe.captureMetric(
        SubmitAnswerHandlerMetrics.VerificationScore,
        MetricUnit.Count,
        verificationScore
      );

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      return { messsage: "AnswerResults Saved" };
    } catch (error: any) {
      const lambdaName = SubmitAnswerHandler.name;
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

  private safeRetrieveLambdaEventInputs(event: any): SubmitAnswerInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    // Parameters
    const parameters = event?.parameters;
    const otgApiUrl = event?.parameters?.otgApiUrl?.value;
    const answersUrl = event?.parameters?.answersUrl?.value;
    const userAgent = event?.parameters?.userAgent?.value;
    const issuer = event?.parameters?.issuer?.value;

    if (!parameters) {
      throw new Error("event parameters not found");
    }

    if (!otgApiUrl) {
      throw new Error("otgApiUrl was not provided");
    }

    if (!answersUrl) {
      throw new Error("otgApiUrl was not provided");
    }

    if (!userAgent) {
      throw new Error("userAgent was not provided");
    }

    if (!issuer) {
      throw new Error("issuer was not provided");
    }

    // personIdentityItem
    const personIdentityItem = event?.personIdentityItem as PersonIdentityItem;
    if (!personIdentityItem) {
      throw new Error("Person identity item was not provided");
    }

    // personIdentityItem with Nino
    const nino: string | undefined =
      personIdentityItem?.socialSecurityRecord?.[0].personalNumber;
    if (!nino) {
      throw new Error("Person identity item did not contain a nino");
    }

    // Final savedAnswersItem item
    const savedAnswersItem = event?.savedAnswersItem;
    if (!savedAnswersItem) {
      throw new Error("Saved answers item was not provided");
    }

    // OTG Token
    const otgToken = event?.bearerToken; // NOTE expiry is not checked as its not used currently
    if (!otgToken) {
      throw new Error("No otgToken provided");
    }

    // Session - Will throw errors on failure
    const sessionItem = event.sessionItem;
    SharedInputsValidator.validateUnmarshalledSessionItem(event.sessionItem);

    return {
      sessionItem: sessionItem as SessionItem,
      nino: nino,
      savedAnswersItem: savedAnswersItem as SavedAnswersItem,
      parameters: parameters,
      otgToken: {
        token: otgToken.value,
        expiry: otgToken.expiry,
      } as OTGToken,
    } as SubmitAnswerInputs;
  }
}

// Handler export
const metricProbe = new MetricsProbe();
const dynamoClient = createDynamoDbClient();

const queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
if (!queueUrl) {
  throw new Error("Missing environment variable: SQS_AUDIT_EVENT_QUEUE_URL");
}

const criAuditConfig: CriAuditConfig = {
  queueUrl,
};

const auditService = new AuditService(
  new SqsAuditClient(
    () => criAuditConfig,
    new SQSClient({
      region: "eu-west-2",
      credentials: fromEnv(),
    })
  )
);
const handlerClass = new SubmitAnswerHandler(
  metricProbe,
  new SubmitAnswerService(metricProbe, auditService),
  new ResultsService(dynamoClient)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
