process.env = {
  SQS_AUDIT_EVENT_QUEUE_URL: "TEST_URL",
};
import { mock } from "jest-mock-extended";
import { Context } from "aws-lambda";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { SubmitAnswerService } from "../src/services/submit-answer-service";
import { ResultsService } from "../src/services/results-service";
import { SubmitAnswerHandler } from "../src/submit-answer-handler";
import { SubmitAnswerResult } from "../src/types/answer-result-types";
import {
  PersonIdentityItem,
  SessionItem,
} from "../../../lib/src/types/common-types";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

describe("submit-answer-handler", () => {
  let mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
  const mockSubmitAnswerService = mock<SubmitAnswerService>();
  const mockAnswerResultsService = mock<ResultsService>();

  let submitAnswerHandler: SubmitAnswerHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
    jest.spyOn(mockMetricsProbe, "captureMetric");

    submitAnswerHandler = new SubmitAnswerHandler(
      mockMetricsProbe,
      mockSubmitAnswerService,
      mockAnswerResultsService
    );
  });

  const mockSessionItem: SessionItem = {
    expiryDate: 1234,
    clientIpAddress: "127.0.0.1",
    redirectUri: "http://localhost:8085/callback",
    clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
    createdDate: 1722954983024,
    clientId: "unit-test-clientid",
    subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
    persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
    attemptCount: 0,
    sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
    state: "7f42f0cc-1681-4455-872f-dd228103a12e",
  };

  const mockPersonIdentityItem: PersonIdentityItem = {
    sessionId: "testSessionId",
    socialSecurityRecord: [
      {
        personalNumber: "AB123456Z",
      },
    ],
    names: [
      {
        nameParts: [
          { type: "GivenName", value: "Rishi" },
          { type: "FamilyName", value: "Johnson" },
        ],
      },
    ],
    birthDates: [
      {
        value: "2000-11-05",
      },
    ],
    expiryDate: 1234,
  };

  const mockSavedAnswersItem: any = {
    expiryDate: Date.now() + 7200 * 1000,
    answers: [
      {
        questionKey: "test-key-1",
        answer: "1234.12",
      },
      {
        questionKey: "test-key-2",
        answer: "5678.34",
      },
      {
        questionKey: "test-key-4",
        answer: "78901.56",
      },
    ],
    correlationId: "unit-test-correlationId",
    sessionId: "unit-test-sessionId",
  };

  const mockInputEvent = {
    sessionId: "sessionId",
    sessionItem: mockSessionItem,
    personIdentityItem: mockPersonIdentityItem,
    savedAnswersItem: mockSavedAnswersItem,
    parameters: {
      otgApiUrl: {
        value: "MOCK_OTGAPIURL",
      },
      answersUrl: {
        value: "MOCK_ANSWERSURL",
      },
      userAgent: {
        value: "MOCK_USERAGENT",
      },
      issuer: {
        value: "MOCK_ISSUER",
      },
    },
    bearerToken: {
      expiry: Date.now() + 7200 * 1000,
      token: "TEST_TOKEN_VALUE",
    },
  };

  describe("happy path scenarios", () => {
    it("it should return the response from the HMRC API", async () => {
      const hmrcResponse = {
        messsage: "AnswerResults Saved",
      };
      global.fetch = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(hmrcResponse),
      });

      const submitAnswerResultArray: SubmitAnswerResult[] = [
        new SubmitAnswerResult("questionKey1", "correct"),
        new SubmitAnswerResult("questionKey2", "incorrect"),
      ];

      mockSubmitAnswerService.checkAnswers.mockResolvedValue(
        submitAnswerResultArray
      );
      const result = await submitAnswerHandler.handler(
        mockInputEvent,
        {} as Context
      );
      expect(result).toEqual(hmrcResponse);

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    });
  });
});
