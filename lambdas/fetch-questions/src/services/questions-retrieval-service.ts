import { LogHelper } from "../../../../lib/src/Logging/log-helper";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { QuestionsResult, Question } from "../types/questions-result-types";
import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { StopWatch } from "../../../../lib/src/Service/stop-watch";
import { FetchQuestionInputs } from "../types/fetch-question-types";

import { AuditService } from "../../../../lib/src/Service/audit-service";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../../lib/src/types/audit-event";
import { SessionItem } from "../../../../lib/src/types/common-types";
import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";

enum QuestionServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
}

const ServiceName: string = "QuestionsRetrievalService";
const logHelper = new LogHelper(ServiceName);

export class QuestionsRetrievalService {
  metricsProbe: MetricsProbe;
  stopWatch: StopWatch;
  auditService: AuditService;
  sqsQueueUrl: string | undefined;

  constructor(metricProbe: MetricsProbe, auditService: AuditService) {
    this.metricsProbe = metricProbe;
    this.stopWatch = new StopWatch();
    this.auditService = auditService;
  }

  public async retrieveQuestions(
    inputs: FetchQuestionInputs
  ): Promise<QuestionsResult> {
    const questionsResult = await this.performAPIRequest(inputs);
    const sessionItem = inputs.sessionItem;
    const nino =
      inputs?.personIdentityItem?.socialSecurityRecord?.[0].personalNumber;
    const endpoint: string = "GetQuestions";
    const issuer = inputs.issuer;
    const questionResultCount: number = questionsResult.getQuestionCount();

    logHelper.info("Sending REQUEST SENT Audit Event");
    this.auditService.sendAuditEvent(
      AuditEventType.REQUEST_SENT,
      sessionItem,
      nino,
      endpoint,
      undefined,
      issuer
    );

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsReturned: questionResultCount,
    };

    logHelper.info("Sending RESPONSE RECEIVED Audit Event");
    this.auditService.sendAuditEvent(
      AuditEventType.RESPONSE_RECEIVED,
      sessionItem,
      undefined,
      endpoint,
      hmrcIvqResponse,
      issuer
    );

    return questionsResult;
  }

  public async attachLogging(
    sessionItem: SessionItem,
    statemachine: Statemachine
  ) {
    logHelper.setSessionItemToLogging(sessionItem);
    logHelper.setStatemachineValuesToLogging(statemachine);
  }

  private async performAPIRequest(
    inputs: FetchQuestionInputs
  ): Promise<QuestionsResult> {
    logHelper.info("Performing API Request");

    // Response Latency (Start)
    this.stopWatch.start();

    return await fetch(inputs.questionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": inputs.userAgent,
        Authorization: "Bearer " + inputs.bearerToken,
      },
      body: JSON.stringify({
        nino: inputs?.personIdentityItem?.socialSecurityRecord?.[0]
          .personalNumber,
      }),
    })
      .then(async (response) => {
        // Happy Path Response Latency
        const latency: number = this.captureResponseLatencyMetric();

        logHelper.info(
          `API Response Status Code: ${response.status}, Latency : ${latency}`
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
                let questionsResult: QuestionsResult;
                try {
                  questionsResult = this.mapToQuestionsResult(jsonResponse);
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
                return questionsResult;
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

  private mapToQuestionsResult(json: any): QuestionsResult {
    logHelper.info(`Mapping QuestionsResult`);

    const correlationId = json.correlationId;
    const responseQuestions = json.questions;
    const mappedQuestions: Question[] = [];

    responseQuestions.forEach(
      (question: {
        [info: string]: { currentTaxYear: string; previousTaxYear: string };
        questionKey: any;
      }) => {
        const questionKey: string = question.questionKey;
        logHelper.debug(`question : ${questionKey}`);

        let currentTaxYear: string | undefined = undefined;
        let previousTaxYear: string | undefined = undefined;

        if (Object.prototype.hasOwnProperty.call(question, "info")) {
          currentTaxYear = question["info"].currentTaxYear;
          previousTaxYear = question["info"].previousTaxYear;
        }

        logHelper.debug(`info currentTaxYear: ${currentTaxYear}`);
        logHelper.debug(`info previousTaxYear: ${previousTaxYear}`);

        mappedQuestions.push(
          new Question(questionKey, currentTaxYear, previousTaxYear)
        );
      }
    );

    // capture both the returned and mapped count (question filtering and metrics for keys/categories to be added)
    this.metricsProbe.captureServiceMetric(
      QuestionServiceMetrics.ResponseQuestionKeyCount,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnit.Count,
      responseQuestions.length
    );

    logHelper.info(`Mapped QuestionsResult`);
    return new QuestionsResult(correlationId, mappedQuestions);
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
