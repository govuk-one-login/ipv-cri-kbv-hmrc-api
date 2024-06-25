/*
import { MetricUnits } from "@aws-lambda-powertools/metrics";

import { DynamoDBDocument, GetCommand } from "@aws-sdk/lib-dynamodb";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { SubmitAnswerService } from "../../src/services/submit-answer-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { mock } from "jest-mock-extended";

enum AnswerServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
  MappedAnswerKeyCount = "MappedAnswerKeyCount",
}

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");
jest.mock("node-fetch");

describe("SubmitAnswerService", () => {
  let submitAnswerService: SubmitAnswerService;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;
  const mockDynamoDocument = mock<DynamoDBDocument>();

  const mockInputEvent = {
    parameters: {
      url: "dummyUrl",
      userAgent: "dummyUserAgent",
    },
    bearerToken: {
      value: "dummyOAuthToken",
    },
    dynamoResult: {
      Item: {
        correlationId: "dummyCorrelationId",
        answers: {
          L: [
            {
              M: {
                questionKey: {
                  S: "dummyQuestionKey1",
                },
                answer: {
                  S: "dummyAnswer1",
                },
              },
            },
            {
              M: {
                questionKey: {
                  S: "dummyQuestionKey2",
                },
                answer: {
                  S: "dummyAnswer2",
                },
              },
            },
          ],
        },
      },
    },
  };

  const personIdentity: Promise<JSON> = {
    personIdentity: {
      Item: {
        socialSecurityRecord: {
          personalNumber: {
            S: "123456789",
          },
        },
      },
    },
  };

  mockDynamoDocument.send.mockReturnValue(personIdentity);

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    submitAnswerService = new SubmitAnswerService(
      mockMetricsProbe.prototype,
      mockDynamoDocument
    );
  });

  describe("Success Scenarios", () => {
    it("should return AnswerResult if request is successfull", async () => {
      const apiResponse = {
        correlationId: "test-correlationId",
        answers: [
          {
            questionKey: "TEST-KEY-1",
            answer: "correct",
          },
          {
            questionKey: "TEST-KEY-2",
            answer: "incorrect",
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

      const result = await submitAnswerService.checkAnswers(mockInputEvent);

      expect(result).toEqual(apiResponse);

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        ResponseValidity.Valid
      );

      // Processed Questions to match response
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        AnswerServiceMetrics.ResponseQuestionKeyCount,
        Classification.SERVICE_SPECIFIC,
        "SubmitAnswersService",
        MetricUnits.Count,
        apiResponse["answers"].length
      );

      // Mapped Questions to the same as Processed (until fitering is added)
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        AnswerServiceMetrics.MappedAnswerKeyCount,
        Classification.SERVICE_SPECIFIC,
        "SubmitAnswersService",
        MetricUnits.Count,
        apiResponse["answers"].length
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

      await expect(
        submitAnswerService.checkAnswers(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          "API Request Failed : Unable to parse json from response unexpected content type : application/unknown"
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
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
        submitAnswerService.checkAnswers(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          `API Request Failed : Unable to parse json from response Unabled to map QuestionsResult from json in response : Cannot read properties of undefined (reading 'forEach')`
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
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
        submitAnswerService.checkAnswers(mockInputEvent)
      ).rejects.toEqual(
        new Error(
          `API Request Failed : API Request Failed due to Credentials being rejected - ${errorReponseText}`
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnits.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
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
          submitAnswerService.checkAnswers(mockInputEvent)
        ).rejects.toEqual(
          new Error(
            `API Request Failed : Unexpected Response ${httpStatus} - ${errorReponseText}`
          )
        );

        // Latency Metric
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.ResponseLatency,
          Classification.HTTP,
          "SubmitAnswersService",
          MetricUnits.Count,
          expect.any(Number)
        );

        // Status code
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          "SubmitAnswersService",
          MetricUnits.Count,
          httpStatus
        );
      }
    );
  });
});
*/
