import { MetricUnit } from "@aws-lambda-powertools/metrics";

import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { SubmitAnswerService } from "../../src/services/submit-answer-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { mock } from "jest-mock-extended";
import { AuditService } from "../../../../lib/src/Service/audit-service";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");
jest.mock("node-fetch");

describe("SubmitAnswerService", () => {
  let submitAnswerService: SubmitAnswerService;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;
  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;

  const mockAuditService = mock<AuditService>();
  const mockDynamoDocument = mock<DynamoDBDocument>();

  const mockInputEvent = {
    sessionId: "sessionId",
    sessionItem: {
      Item: {
        expiryDate: {
          N: "1234",
        },
        clientIpAddress: {
          S: "127.0.0.1",
        },
        redirectUri: {
          S: "http://localhost:8085/callback",
        },
        clientSessionId: {
          S: "2d35a412-125e-423e-835e-ca66111a38a1",
        },
        createdDate: {
          N: "1722954983024",
        },
        clientId: {
          S: "unit-test-clientid",
        },
        subject: {
          S: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        },
        persistentSessionId: {
          S: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        },
        attemptCount: {
          N: "0",
        },
        sessionId: {
          S: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        },
        state: {
          S: "7f42f0cc-1681-4455-872f-dd228103a12e",
        },
      },
    },
    parameters: {
      answersUrl: "dummyUrl",
      userAgent: "dummyUserAgent",
      issuer: "https://issuer/gov.uk",
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

  const personIdentity = {
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

  mockDynamoDocument.send.mockImplementation(() =>
    Promise.resolve(personIdentity)
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    submitAnswerService = new SubmitAnswerService(
      mockMetricsProbe.prototype,
      mockDynamoDocument,
      mockAuditService
    );
  });

  describe("Success Scenarios", () => {
    it("should return AnswerResult if request is successfull", async () => {
      const apiRequest: Array<any> = [
        {
          questionKey: "TEST-KEY-1",
          answer: "correct",
        },
        {
          questionKey: "TEST-KEY-2",
          answer: "incorrect",
        },
      ];

      const apiResponse: Array<any> = [
        {
          status: undefined,
          questionKey: "TEST-KEY-1",
        },
        {
          status: undefined,
          questionKey: "TEST-KEY-2",
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => apiRequest,
        } as Response)
      ) as jest.Mock;

      const result = await submitAnswerService.checkAnswers(mockInputEvent);

      expect(result).toEqual(apiResponse);

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        1,
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Answers submitted
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        2,
        "AnswersSubmitted",
        Classification.SERVICE_SPECIFIC,
        "SubmitAnswersService",
        MetricUnit.Count,
        3
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        3,
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        200
      );

      // Answers correct
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        4,
        "AnswersCorrect",
        Classification.SERVICE_SPECIFIC,
        "SubmitAnswersService",
        MetricUnit.Count,
        0
      );

      // Answers incorrect
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        5,
        "AnswersIncorrect",
        Classification.SERVICE_SPECIFIC,
        "SubmitAnswersService",
        MetricUnit.Count,
        2
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenNthCalledWith(
        6,
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        ResponseValidity.Valid
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
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
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
          `API Request Failed : Unable to parse json from response Unabled to map QuestionsResult from json in response : responseAnswers.forEach is not a function`
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
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
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "SubmitAnswersService",
        MetricUnit.Count,
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
          MetricUnit.Count,
          expect.any(Number)
        );

        // Status code
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          "SubmitAnswersService",
          MetricUnit.Count,
          httpStatus
        );
      }
    );
  });
});
