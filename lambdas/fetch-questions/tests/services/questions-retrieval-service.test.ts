import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { QuestionsResult } from "../../src/types/questions-result-types";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { QuestionsRetrievalService } from "../../src/services/questions-retrieval-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";

enum QuestionServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
  MappedQuestionKeyCount = "MappedQuestionKeyCount",
}

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");
jest.mock("node-fetch");

describe("QuestionsRetrievalService", () => {
  let questionsRetrievalService: QuestionsRetrievalService;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;

  const mockInputEvent = {
    parameters: {
      url: "dummyUrl",
      userAgent: "dummyUserAgent",
    },
    bearerToken: {
      value: "dummyOAuthToken",
    },
    personIdentityItem: {
      nino: "dummyNino",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    questionsRetrievalService = new QuestionsRetrievalService(
      mockMetricsProbe.prototype
    );
  });

  describe("Success Scenarios", () => {
    it("should return QuestionsResult if request is successfull", async () => {
      const apiResponse = {
        correlationId: "test-correlationId",
        questions: [
          {
            questionKey: "TEST-KEY-1",
            info: {
              taxYearCurrent: "2024/25",
              taxYearPrevious: "2023/24",
            },
          },
          {
            questionKey: "TEST-KEY-2",
          },
          {
            questionKey: "TEST-KEY-3",
          },
        ],
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "application/json";
            }),
          },
          json: () => Promise.resolve(apiResponse),
          text: () => Promise.resolve(apiResponse),
        })
      ) as jest.Mock;

      const questionsResult: QuestionsResult =
        await questionsRetrievalService.retrieveQuestions(mockInputEvent);

      const correlationId: string = questionsResult.getCorrelationId();
      expect(correlationId).toEqual(apiResponse["correlationId"]);

      const questionCount: number = questionsResult.getQuestionCount();
      expect(questionCount).toEqual(apiResponse["questions"].length);

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        ResponseValidity.Valid
      );

      // Processed Questions to match response
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        QuestionServiceMetrics.ResponseQuestionKeyCount,
        Classification.SERVICE_SPECIFIC,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        apiResponse["questions"].length
      );

      // Mapped Questions to the same as Processed (until fitering is added)
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        QuestionServiceMetrics.MappedQuestionKeyCount,
        Classification.SERVICE_SPECIFIC,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        apiResponse["questions"].length
      );
    });
  });

  describe("Failure Scenarios", () => {
    it("should throw an Error if API response is 200 but content-type is not application/json", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "application/unknown";
            }),
          },
        })
      ) as jest.Mock;

      // const questionsResult: QuestionsResult =
      //   await questionsRetrievalService.retrieveQuestions(mockInputEvent);

      await expect(
        questionsRetrievalService.retrieveQuestions(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          "API Request Failed : Unable to parse json from response unexpected content type : application/unknown"
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        ResponseValidity.Invalid
      );
    });

    it("should throw an Error if API response is 200, content-type is application/json but response failed to be mapped to QuestionsResult", async () => {
      const invalidJsonResponse: string = "}INVALID JSON}}{{";
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "application/json";
            }),
          },
          json: () => Promise.resolve(invalidJsonResponse),
          text: () => Promise.resolve(invalidJsonResponse),
        })
      ) as jest.Mock;

      await expect(
        questionsRetrievalService.retrieveQuestions(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          `API Request Failed : Unable to parse json from response Unabled to map QuestionsResult from json in response : Cannot read properties of undefined (reading 'forEach')`
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        ResponseValidity.Invalid
      );
    });

    it("should throw an Error if API response status code is 401", async () => {
      const errorReponseText: string = "Unit test invalid token response body";
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 401,
          headers: {
            get: jest.fn(() => {
              return "application/json";
            }),
          },
          // json: () => Promise.resolve(invalidJsonResponse),
          text: () => Promise.resolve(errorReponseText),
        })
      ) as jest.Mock;

      await expect(
        questionsRetrievalService.retrieveQuestions(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          `API Request Failed : API Request Failed due to Credentials being rejected - ${errorReponseText}`
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnits.Count,
        401
      );
    });

    it.each([[500], [400], [300]])(
      "should throw an Error if API HTTP status response is unexpected",
      async (httpStatus: number) => {
        const errorReponseText: string = `Unit test server ${httpStatus} - error response body`;
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: httpStatus,
            headers: {
              get: jest.fn(() => {
                return "application/json";
              }),
            },
            // json: () => Promise.resolve(invalidJsonResponse),
            text: () => Promise.resolve(errorReponseText),
          })
        ) as jest.Mock;

        await expect(
          questionsRetrievalService.retrieveQuestions(mockInputEvent)
        ).rejects.toEqual(
          new Error(
            `API Request Failed : Unexpected Response ${httpStatus} - ${errorReponseText}`
          )
        );

        // Latency Metric
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.ResponseLatency,
          Classification.HTTP,
          "QuestionsRetrievalService",
          MetricUnits.Count,
          expect.any(Number)
        );

        // Status code
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          "QuestionsRetrievalService",
          MetricUnits.Count,
          httpStatus
        );
      }
    );
  });
});
