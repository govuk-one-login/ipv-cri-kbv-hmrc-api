import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { QuestionsResult } from "../../src/types/questions-result-types";

import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { QuestionsRetrievalService } from "../../src/services/questions-retrieval-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { FetchQuestionInputs } from "../../src/types/fetch-question-types";
import { AuditService } from "../../../../lib/src/Service/audit-service";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../../lib/src/types/audit-event";

enum QuestionServiceMetrics {
  ResponseQuestionKeyCount = "ResponseQuestionKeyCount",
}

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");
jest.mock("node-fetch");
jest.mock("../../../../lib/src/Service/audit-service");

describe("QuestionsRetrievalService", () => {
  let questionsRetrievalService: QuestionsRetrievalService;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;
  let mockAuditService: jest.MockedObjectDeep<typeof AuditService>;

  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;
  let mockAuditServiceSpy: jest.SpyInstance;

  const mockFetchQuestionInputs = {
    sessionId: "SESSION_ID",
    questionsUrl: "dummyUrl",
    userAgent: "dummyUserAgent",
    bearerToken: "dummyBearerToken",
    nino: "dummyNino",
    sessionItem: {
      Item: {
        expiryDate: {
          N: "1234",
        },
        clientIpAddress: {
          S: "51.149.8.131",
        },
        subject: {
          S: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        },
        persistentSessionId: {
          S: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        },
        sessionId: {
          S: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        },
        clientSessionId: {
          S: "b8c1fb22-7fd2-4935-ab8b-a70d6cf18949",
        },
      },
    },
  } as FetchQuestionInputs;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);
    mockAuditService = jest.mocked(AuditService);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    mockAuditServiceSpy = jest.spyOn(
      mockAuditService.prototype,
      "sendAuditEvent"
    );

    questionsRetrievalService = new QuestionsRetrievalService(
      mockMetricsProbe.prototype,
      mockAuditService.prototype
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
              currentTaxYear: "2024/25",
              previousTaxYear: "2023/24",
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
        await questionsRetrievalService.retrieveQuestions(
          mockFetchQuestionInputs
        );

      const correlationId: string = questionsResult.getCorrelationId();
      expect(correlationId).toEqual(apiResponse["correlationId"]);

      const questionCount: number = questionsResult.getQuestionCount();
      expect(questionCount).toEqual(apiResponse["questions"].length);

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        ResponseValidity.Valid
      );

      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        QuestionServiceMetrics.ResponseQuestionKeyCount,
        Classification.SERVICE_SPECIFIC,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        apiResponse["questions"].length
      );

      expect(mockAuditServiceSpy).toHaveBeenCalledWith(
        AuditEventType.REQUEST_SENT,
        mockFetchQuestionInputs.sessionItem,
        mockFetchQuestionInputs.nino,
        "GetQuestions"
      );

      const hmrcIvqResponse: HmrcIvqResponse = {
        totalQuestionsReturned: 3,
      };

      expect(mockAuditServiceSpy).toHaveBeenCalledWith(
        AuditEventType.RESPONSE_RECEIVED,
        mockFetchQuestionInputs.sessionItem,
        undefined,
        "GetQuestions",
        hmrcIvqResponse
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
        questionsRetrievalService.retrieveQuestions(mockFetchQuestionInputs)
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
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
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
        questionsRetrievalService.retrieveQuestions(mockFetchQuestionInputs)
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
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
        MetricUnit.Count,
        200
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "QuestionsRetrievalService",
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
        questionsRetrievalService.retrieveQuestions(mockFetchQuestionInputs)
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
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "QuestionsRetrievalService",
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
          questionsRetrievalService.retrieveQuestions(mockFetchQuestionInputs)
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
          MetricUnit.Count,
          expect.any(Number)
        );

        // Status code
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          "QuestionsRetrievalService",
          MetricUnit.Count,
          httpStatus
        );
      }
    );
  });
});
