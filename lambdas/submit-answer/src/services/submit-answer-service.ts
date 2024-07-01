import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Logger } from "@aws-lambda-powertools/logger";
import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { Answer, SubmitAnswerResult } from "../types/answer-result-types";
import { DynamoDBDocument, GetCommand } from "@aws-sdk/lib-dynamodb";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";

enum AnswerServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
  MappedAnswerKeyCount = "MappedAnswerKeyCount",
}

const ServiceName: string = "SubmitAnswersService";
const logger = new Logger({ serviceName: `${ServiceName}` });

export class SubmitAnswerService {
  private metricsProbe: MetricsProbe;
  private dynamo: DynamoDBDocument;

  constructor(metricProbe: MetricsProbe, dyanamoDbClient: DynamoDBDocument) {
    this.metricsProbe = metricProbe;
    this.dynamo = dyanamoDbClient;
  }

  public async checkAnswers(event: any): Promise<SubmitAnswerResult[]> {
    logger.info("Getting nino value...");
    const nino: string = await this.getNino(event);

    logger.info("Mapping answers to format accepted by HMRC...");
    const answers: Answer[] = this.mapAnswersForThirdParty(event);

    return await this.verifyWithThirdParty(event, nino, answers);
  }

  private async verifyWithThirdParty(
    event: any,
    nino: string,
    answers: Answer[]
  ): Promise<SubmitAnswerResult[]> {
    logger.info("Performing Submit Answers API Request...");

    // Response Latency (Start)
    const start: number = Date.now();

    return await fetch(event.parameters.url, {
      //How to get URL from template? Can JB pass url in event?
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": event.parameters.userAgent,
        Authorization: "Bearer " + event.bearerToken.value, //don't think we'll have this in the event
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
        const latency: number = this.captureResponseLatency(start);

        logger.info(
          `API Response Status Code: ${response.status}, Latency : ${latency}`
        );

        // Response Status code
        this.metricsProbe.captureServiceMetric(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          ServiceName,
          MetricUnits.Count,
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
                  MetricUnits.Count,
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
        const subError: string = error.message;

        const errorText: string = `Unable to parse json from response ${subError}`;

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
    const nino: string = personIdentity?.socialSecurityRecord?.personalNumber;
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

    responseAnswers.forEach(
      (answer: { questionKey: string; score: string }) => {
        const questionKey: string = answer.questionKey;
        logger.debug(`questionKey : ${questionKey}`);

        const answerStatus: string = answer.score;
        logger.debug(`answer status: ${answerStatus}`);

        mappedAnswers.push(new SubmitAnswerResult(questionKey, answerStatus));
      }
    );

    this.metricsProbe.captureServiceMetric(
      AnswerServiceMetrics.ResponseQuestionKeyCount,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnits.Count,
      responseAnswers.length
    );

    this.metricsProbe.captureServiceMetric(
      AnswerServiceMetrics.MappedAnswerKeyCount,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnits.Count,
      responseAnswers.length
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

  private captureResponseLatency(start: number): number {
    // Response Latency (End)
    const latency: number = Date.now() - start;
    this.metricsProbe.captureServiceMetric(
      HTTPMetric.ResponseLatency,
      Classification.HTTP,
      ServiceName,
      MetricUnits.Count,
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
