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
    this.metricsProbe = metricProbe;
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
      const answerResult: SubmitAnswerResult[] =
        await this.submitAnswerService.checkAnswers(event);

      const verificationScore: number =
        verificationScoreCalculator.calculateVerificationScore(answerResult);

      const sessionId = event.sessionId;
      const correlationId = event.dynamoResult.Item.correlationId.S;
      const ttl = event.usersQuestions.Items[0].expiryDate as number;

      await this.resultService.saveResults(
        sessionId,
        correlationId,
        ttl,
        answerResult,
        verificationScore,
        checkDetailsCountCalculator.calculateAnswerCount(
          answerResult,
          "correct"
        ),
        checkDetailsCountCalculator.calculateAnswerCount(
          answerResult,
          "incorrect"
        )
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
const handlerClass = new SubmitAnswerHandler(
  metricProbe,
  new SubmitAnswerService(metricProbe, createDynamoDbClient()),
  new ResultsService(createDynamoDbClient())
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
