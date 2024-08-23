import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Logger } from "@aws-lambda-powertools/logger";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Answer, SubmitAnswerResult } from "../types/answer-result-types";
import { DynamoDBDocument, GetCommand } from "@aws-sdk/lib-dynamodb";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";

import { CheckDetailsCountCalculator } from ".././utils/check-details-count-calculator";

import { StopWatch } from "../../../../lib/src/Service/stop-watch";
import { AuditService } from "../../../../lib/src/Service/audit-service";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../../lib/src/types/audit-event";

enum AnswerServiceMetrics {
  AnswersSubmitted = "AnswersSubmitted",
  AnswersCorrect = "AnswersCorrect",
  AnswersIncorrect = "AnswersIncorrect",
}

const ServiceName: string = "SubmitAnswersService";
const logger = new Logger({ serviceName: `${ServiceName}` });

const checkDetailsCountCalculator = new CheckDetailsCountCalculator();

export class SubmitAnswerService {
  private metricsProbe: MetricsProbe;
  private dynamo: DynamoDBDocument;
  private stopWatch: StopWatch;
  private auditService: AuditService;

  constructor(
    metricProbe: MetricsProbe,
    dyanamoDbClient: DynamoDBDocument,
    auditService: AuditService
  ) {
    this.metricsProbe = metricProbe;
    this.dynamo = dyanamoDbClient;
    this.stopWatch = new StopWatch();
    this.auditService = auditService;
  }

  public async checkAnswers(event: any): Promise<SubmitAnswerResult[]> {
    logger.info("Getting nino value...");
    const nino: string = await this.getNino(event);

    logger.info("Mapping answers to format accepted by HMRC...");
    const answers: Answer[] = this.mapAnswersForThirdParty(event);

    const results = await this.verifyWithThirdParty(event, nino, answers);

    //For building and sending audit events
    const sessionItem = event.sessionItem;
    const endpoint = "SubmitAnswers";

    const correctAnswerCount = checkDetailsCountCalculator.calculateAnswerCount(
      results,
      "correct"
    );
    const incorrectAnswerCount =
      checkDetailsCountCalculator.calculateAnswerCount(results, "incorrect");

    logger.info("Sending REQUEST_SENT Audit Event");
    await this.auditService.sendAuditEvent(
      AuditEventType.REQUEST_SENT,
      sessionItem,
      nino,
      endpoint,
      undefined,
      event.parameters.issuer
    );

    const totalQuestionsAsked = correctAnswerCount + incorrectAnswerCount;
    let outcome = "Not Authenticated";
    if (correctAnswerCount > 2) {
      outcome = "Authenticated";
    }

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect: correctAnswerCount,
      totalQuestionsAsked: totalQuestionsAsked,
      totalQuestionsAnsweredIncorrect: incorrectAnswerCount,
      outcome: outcome,
    };

    logger.info("Sending RESPONSE RECEIVED Audit Event");
    await this.auditService.sendAuditEvent(
      AuditEventType.RESPONSE_RECEIVED,
      sessionItem,
      undefined,
      endpoint,
      hmrcIvqResponse,
      event.parameters.issuer
    );

    return results;
  }

  private async verifyWithThirdParty(
    event: any,
    nino: string,
    answers: Answer[]
  ): Promise<SubmitAnswerResult[]> {
    logger.info("Performing Submit Answers API Request...");

    // Response Latency (Start)
    this.stopWatch.start();

    return await fetch(event.parameters.url.value, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": event.parameters.userAgent.value,
        Authorization: "Bearer " + event.bearerToken.value,
      },
      body: JSON.stringify({
        correlationId: event?.usersQuestions?.Items[0]?.correlationId?.S,
        selection: {
          nino: nino,
        },
        answers: answers,
      }),
    })
      .then(async (response) => {
        const latency: number = this.captureResponseLatencyMetric();

        logger.info(
          `API Response Status Code: ${response.status}, Latency : ${latency}`
        );

        this.metricsProbe.captureServiceMetric(
          AnswerServiceMetrics.AnswersSubmitted,
          Classification.SERVICE_SPECIFIC,
          ServiceName,
          MetricUnit.Count,
          answers.length
        );

        // Response Status code
        this.metricsProbe.captureServiceMetric(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          ServiceName,
          MetricUnit.Count,
          response.status
        );

        switch (response.status) {
          case 200: {
            return this.retrieveJSONResponse(response)
              .then((jsonResponse) => {
                let answerResults: SubmitAnswerResult[];
                try {
                  answerResults = this.mapToAnswerResults(jsonResponse);
                } catch (error: any) {
                  const errorText: string = error.message;

                  throw new Error(
                    `Unabled to map QuestionsResult from json in response : ${errorText}`
                  );
                }

                this.metricsProbe.captureServiceMetric(
                  HTTPMetric.ResponseValidity,
                  Classification.HTTP,
                  ServiceName,
                  MetricUnit.Count,
                  ResponseValidity.Valid
                );
                return answerResults;
              })
              .catch((error: Error) => {
                const subError: string = error.message;

                const errorText: string = `Unable to parse json from response ${subError}`;

                throw new Error(errorText);
              });
          }
          case 401: {
            // oauth token rejected
            const errorText: string = await Promise.resolve(response.text());

            throw new Error(
              `API Request Failed due to Credentials being rejected - ${errorText}`
            );
          }
          case 404: {
            // bad request format (or nino didn't match)
            const errorText: string = await Promise.resolve(response.text());

            throw new Error(
              `API Request Failed due to request format being rejected - ${errorText}`
            );
          }
          default: {
            // any other status code
            const errorText: string = await Promise.resolve(response.text());

            throw new Error(
              `Unexpected Response ${response.status} - ${errorText}`
            );
          }
        }
      })

      .catch((error: Error) => {
        // All errors caught in this top level catch
        this.metricsProbe.captureServiceMetric(
          HTTPMetric.ResponseValidity,
          Classification.HTTP,
          ServiceName,
          MetricUnit.Count,
          ResponseValidity.Invalid
        );

        // Error Path Response Latency
        const latency: number = this.captureResponseLatencyMetric();

        // any other status code
        const errorText: string = `API Request Failed : ${error.message}`;

        logger.error(`${errorText}, Latency : ${latency}`);

        throw new Error(errorText);
      });
  }

  private mapAnswersForThirdParty(event: any): Answer[] {
    const requestBody = this.mapItemsToAnswers(
      event?.dynamoResult?.Item?.answers?.L
    );

    requestBody.push(new Answer(event.answeredQuestionKey, event.inputAnswer));
    return requestBody;
  }

  private async getNino(event: any): Promise<string> {
    const personIdentity = await this.getPersonIdentityItem(event.sessionId);
    const nino: string = personIdentity?.socialSecurityRecord[0].personalNumber;
    return nino;
  }

  private async retrieveJSONResponse(response: Response): Promise<any> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return await response.json();
    } else {
      // Not logged as caught in caller
      const errorText: string = `unexpected content type : ${contentType}`;
      throw new Error(errorText);
    }
  }

  private mapToAnswerResults(json: any): SubmitAnswerResult[] {
    logger.info(`Mapping AnswersResult`);

    const responseAnswers = json;
    const mappedAnswers: SubmitAnswerResult[] = [];

    let correctAnswers: number = 0;
    let incorrectAnswers: number = 0;

    responseAnswers.forEach(
      (answer: { questionKey: string; score: string }) => {
        const questionKey: string = answer.questionKey;
        logger.debug(`questionKey : ${questionKey}`);

        const answerStatus: string = answer.score;
        logger.debug(`answer status: ${answerStatus}`);

        if (answerStatus === "correct") {
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }

        mappedAnswers.push(new SubmitAnswerResult(questionKey, answerStatus));
      }
    );

    this.metricsProbe.captureServiceMetric(
      AnswerServiceMetrics.AnswersCorrect,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnit.Count,
      correctAnswers
    );

    this.metricsProbe.captureServiceMetric(
      AnswerServiceMetrics.AnswersIncorrect,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnit.Count,
      incorrectAnswers
    );

    logger.info(`Mapped QuestionsResult`);
    return mappedAnswers;
  }

  private mapItemsToAnswers(items: any) {
    const answersArray: Answer[] = [];
    if (items != undefined && items.length > 0) {
      items.forEach((element: { M: { [x: string]: { S: string } } }) => {
        answersArray.push(
          new Answer(element.M["questionKey"].S, element.M["answer"].S)
        );
      });
    }

    return answersArray;
  }

  private captureResponseLatencyMetric(): number {
    // Response Latency (End)
    const latency: number = this.stopWatch.stop();
    this.metricsProbe.captureServiceMetric(
      HTTPMetric.ResponseLatency,
      Classification.HTTP,
      ServiceName,
      MetricUnit.Count,
      latency
    );

    return latency;
  }

  private async getPersonIdentityItem(
    sessionId: Record<string, unknown>
  ): Promise<Record<string, any> | undefined> {
    const command = new GetCommand({
      TableName: process.env.PERSON_IDENTITY_TABLE_NAME,
      Key: {
        sessionId: sessionId,
      },
    });
    const personIdentityItem = await this.dynamo.send(command);
    return personIdentityItem.Item;
  }
}
