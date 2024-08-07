import { Logger } from "@aws-lambda-powertools/logger";
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

enum QuestionServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
}

const ServiceName: string = "QuestionsRetrievalService";
const logger = new Logger({ serviceName: `${ServiceName}` });

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
    const nino = inputs.nino;
    const endpoint: string = "GetQuestions";
    const questionResultCount: number = questionsResult.getQuestionCount();

    logger.info("Sending REQUEST SENT Audit Event");
    this.auditService.sendAuditEvent(
      AuditEventType.REQUEST_SENT,
      sessionItem,
      nino,
      endpoint
    );

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsReturned: questionResultCount,
    };

    logger.info("Sending RESPONSE RECEIVED Audit Event");
    this.auditService.sendAuditEvent(
      AuditEventType.RESPONSE_RECEIVED,
      sessionItem,
      undefined,
      endpoint,
      hmrcIvqResponse
    );

    return questionsResult;
  }

  private async performAPIRequest(
    inputs: FetchQuestionInputs
  ): Promise<QuestionsResult> {
    logger.info("Performing API Request");

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
        nino: inputs.nino,
      }),
    })
      .then(async (response) => {
        // Happy Path Response Latency
        const latency: number = this.captureResponseLatencyMetric();

        logger.info(
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

        logger.error(`${errorText}, Latency : ${latency}`);

        throw new Error(errorText);
      });
  }

  private mapToQuestionsResult(json: any): QuestionsResult {
    logger.info(`Mapping QuestionsResult`);

    const correlationId = json.correlationId;
    const responseQuestions = json.questions;
    const mappedQuestions: Question[] = [];

    responseQuestions.forEach(
      (question: {
        [info: string]: { taxYearCurrent: string; taxYearPrevious: string };
        questionKey: any;
      }) => {
        const questionKey: string = question.questionKey;
        logger.debug(`question : ${questionKey}`);

        let taxYearCurrent: string | undefined = undefined;
        let taxYearPrevious: string | undefined = undefined;

        if (Object.prototype.hasOwnProperty.call(question, "info")) {
          taxYearCurrent = question["info"].taxYearCurrent;
          taxYearPrevious = question["info"].taxYearPrevious;
        }

        logger.debug(`info taxYearCurrent: ${taxYearCurrent}`);
        logger.debug(`info taxYearPrevious: ${taxYearPrevious}`);

        mappedQuestions.push(
          new Question(questionKey, taxYearCurrent, taxYearPrevious)
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

    logger.info(`Mapped QuestionsResult`);
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
