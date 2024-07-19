import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { ResultsService } from "./services/results-service";
import { SubmitAnswerService } from "./services/submit-answer-service";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";

import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { VerificationScoreCalculator } from "./utils/verification-score-calculator";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { SubmitAnswerResult } from "./types/answer-result-types";

const logger = new Logger();
const verificationScoreCalculator = new VerificationScoreCalculator();

export class SubmitAnswerHandler implements LambdaInterface {
  submitAnswerService: SubmitAnswerService;
  resultService: ResultsService;

  constructor(
    metricProbe: MetricsProbe,
    submitAnswerService: SubmitAnswerService,
    saveAnswerResultService: ResultsService
  ) {
    this.submitAnswerService = submitAnswerService;
    this.resultService = saveAnswerResultService;
  }

  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      const answerResult: SubmitAnswerResult[] =
        await this.submitAnswerService.checkAnswers(event);

      await this.resultService.saveResults(
        event.sessionId,
        event.dynamoResult.Item.correlationId.S,
        event.usersQuestions.Items[0].expiryDate,
        answerResult,
        verificationScoreCalculator.calculateVerificationScore(answerResult)
      );

      return { messsage: "AnswerResults Saved" };
    } catch (error: any) {
      const lambdaName = SubmitAnswerHandler.name;
      const errorText: string = error.message;

      const errorMessage = `${lambdaName} : ${errorText}`;
      logger.error(errorMessage);

      metricProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnits.Count,
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
