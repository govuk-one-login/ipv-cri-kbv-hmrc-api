import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { Logger } from "@aws-lambda-powertools/logger";
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

const logger = new Logger({ serviceName: "SubmitAnswerHandler" });
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

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      const sessionId = event?.sessionId;
      const sessionTtl = event?.sessionItem?.Item?.expiryDate?.N;

      if (!event) {
        throw new Error("input event is empty");
      }

      if (!sessionId) {
        throw new Error("sessionId was not provided");
      }

      if (!sessionTtl) {
        throw new Error("sessionItem was not provided - cannot use ttl");
      }
      logger.info("Handler start");

      const answerResult: SubmitAnswerResult[] =
        await this.submitAnswerService.checkAnswers(event);

      const verificationScore: number =
        verificationScoreCalculator.calculateVerificationScore(answerResult);

      const correlationId = event.dynamoResult.Item.correlationId.S;

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
        sessionId,
        correlationId,
        Number(sessionTtl),
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
  new SubmitAnswerService(metricProbe, dynamoClient, auditService),
  new ResultsService(dynamoClient)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
