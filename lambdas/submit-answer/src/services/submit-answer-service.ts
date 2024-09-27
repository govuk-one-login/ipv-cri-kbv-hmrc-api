import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { SubmitAnswerResult } from "../types/answer-result-types";

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
import { SessionItem } from "../../../../lib/src/types/common-types";
import { OTGToken } from "../../../../lib/src/types/otg-token-types";
import { LogHelper } from "../../../../lib/src/Logging/log-helper";
import { SavedAnswersItem } from "../types/submit-answer-types";
import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";

enum AnswerServiceMetrics {
  AnswersSubmitted = "AnswersSubmitted",
  AnswersCorrect = "AnswersCorrect",
  AnswersIncorrect = "AnswersIncorrect",
}

const ServiceName: string = "SubmitAnswersService";
const logHelper = new LogHelper(ServiceName);

const checkDetailsCountCalculator = new CheckDetailsCountCalculator();

export class SubmitAnswerService {
  private metricsProbe: MetricsProbe;
  private stopWatch: StopWatch;
  private auditService: AuditService;

  constructor(metricProbe: MetricsProbe, auditService: AuditService) {
    this.metricsProbe = metricProbe;
    this.stopWatch = new StopWatch();
    this.auditService = auditService;
  }

  public async checkAnswers(
    sessionItem: SessionItem,
    nino: string,
    savedAnswersItem: SavedAnswersItem,
    parameters: any,
    otgToken: OTGToken
  ): Promise<SubmitAnswerResult[]> {
    const results = await this.verifyWithThirdParty(
      nino,
      savedAnswersItem,
      parameters,
      otgToken
    );

    //For building and sending audit events
    const endpoint = "SubmitAnswers";

    const correctAnswerCount = checkDetailsCountCalculator.calculateAnswerCount(
      results,
      "correct"
    );
    const incorrectAnswerCount =
      checkDetailsCountCalculator.calculateAnswerCount(results, "incorrect");

    logHelper.info("Sending REQUEST_SENT Audit Event");
    await this.auditService.sendAuditEvent(
      AuditEventType.REQUEST_SENT,
      sessionItem,
      nino,
      endpoint,
      undefined,
      parameters.issuer.value
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

    logHelper.info("Sending RESPONSE RECEIVED Audit Event");
    await this.auditService.sendAuditEvent(
      AuditEventType.RESPONSE_RECEIVED,
      sessionItem,
      undefined,
      endpoint,
      hmrcIvqResponse,
      parameters.issuer.value
    );

    return results;
  }

  public async attachLogging(
    sessionItem: SessionItem,
    statemachine: Statemachine
  ) {
    logHelper.setSessionItemToLogging(sessionItem);
    logHelper.setStatemachineValuesToLogging(statemachine);
  }

  private async verifyWithThirdParty(
    nino: string,
    savedAnswersItem: SavedAnswersItem,
    parameters: any,
    otgToken: OTGToken
  ): Promise<SubmitAnswerResult[]> {
    logHelper.info("Performing Submit Answers API Request...");

    // Response Latency (Start)
    this.stopWatch.start();

    return await fetch(parameters.answersUrl.value, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": parameters.userAgent.value,
        Authorization: "Bearer " + otgToken.token,
      },
      body: JSON.stringify({
        correlationId: savedAnswersItem.correlationId, //event?.usersQuestions?.Items[0]?.correlationId?.S,
        selection: {
          nino: nino,
        },
        answers: savedAnswersItem.answers,
      }),
    })
      .then(async (response) => {
        const latency: number = this.captureResponseLatencyMetric();

        logHelper.info(
          `API Response Status Code: ${response.status}, Latency : ${latency}`
        );

        this.metricsProbe.captureServiceMetric(
          AnswerServiceMetrics.AnswersSubmitted,
          Classification.SERVICE_SPECIFIC,
          ServiceName,
          MetricUnit.Count,
          savedAnswersItem.answers.length
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

        logHelper.error(`${errorText}, Latency : ${latency}`);

        throw new Error(errorText);
      });
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
    logHelper.info(`Mapping AnswersResult`);

    const responseAnswers = json;
    const mappedAnswers: SubmitAnswerResult[] = [];

    let correctAnswers: number = 0;
    let incorrectAnswers: number = 0;

    responseAnswers.forEach(
      (answer: { questionKey: string; score: string }) => {
        const questionKey: string = answer.questionKey;
        logHelper.debug(`questionKey : ${questionKey}`);

        const answerStatus: string = answer.score;
        logHelper.debug(`answer status: ${answerStatus}`);

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

    logHelper.info(`Mapped QuestionsResult`);
    return mappedAnswers;
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
}
