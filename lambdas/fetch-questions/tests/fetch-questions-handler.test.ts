import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { FetchQuestionsHandler } from "../src/fetch-questions-handler";
import { Question } from "../src/types/questions-result-types";
import { QuestionsRetrievalService } from "../src/services/questions-retrieval-service";
import { QuestionsResult } from "../src/types/questions-result-types";
import { MetricsProbe } from "../src/../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("@aws-lambda-powertools/logger");
jest.mock("../src/services/questions-retrieval-service");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

describe("FetchQuestionsHandler", () => {
  let fetchQuestionsHandler: FetchQuestionsHandler;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockQuestionsRetrievalService: jest.MockedObjectDeep<
    typeof QuestionsRetrievalService
  >;
  let questionsRetrievalServiceSpy: jest.SpyInstance;
  let mockMetricsProbeSpy: jest.SpyInstance;

  const mockInputEvent = {
    parameters: {
      url: "dummyUrl",
      userAgent: "dummyUserAgent",
    },
    bearerToken: {
      value: "dummyOAuthToken",
    },
    nino: "dummyNino",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);
    mockQuestionsRetrievalService = jest.mocked(QuestionsRetrievalService);

    questionsRetrievalServiceSpy = jest.spyOn(
      mockQuestionsRetrievalService.prototype,
      "retrieveQuestions"
    );

    mockMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureMetric"
    );

    fetchQuestionsHandler = new FetchQuestionsHandler(
      mockMetricsProbe.prototype,
      mockQuestionsRetrievalService.prototype
    );
  });

  describe("Success Scenarios", () => {
    it.each([
      [[], 0], // Zero questions
      [[new Question("TestKey1", undefined, undefined)], 1],
      [
        [
          new Question("TestKey1", undefined, undefined),
          new Question("TestKey2", "2021/2022", "2020/2021"),
        ],
        2,
      ],
      [
        [
          new Question("TestKey1", undefined, undefined),
          new Question("TestKey2", "2021/2022", "2020/2021"),
          new Question("TestKey3", undefined, undefined),
        ],
        3,
      ],
    ])(
      "should return a count of questions for a valid nino when questions are returned",
      async (questions: Question[], expectedQuestionCount: number) => {
        const correlationId: string = "test-correlsation-id";

        const mockQuestionsRetrievalServiceResponse = new QuestionsResult(
          correlationId,
          questions
        );

        questionsRetrievalServiceSpy.mockResolvedValue(
          mockQuestionsRetrievalServiceResponse
        );

        const lambdaResponse = await fetchQuestionsHandler.handler(
          mockInputEvent,
          undefined
        );

        expect(questionsRetrievalServiceSpy).toHaveBeenCalledWith(
          mockInputEvent
        );

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnits.Count,
          CompletionStatus.OK
        );

        const expectedResponse = {
          availableQuestions: `${expectedQuestionCount}`,
        };
        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );
  });

  describe("Failure Scenarios", () => {
    it("should return an error if there is an issue during question retrieval ", async () => {
      questionsRetrievalServiceSpy.mockImplementation(() => {
        const testErrorMessage: string = "An error occured";
        throw new Error(testErrorMessage);
      });

      const lambdaResponse = await fetchQuestionsHandler.handler(
        mockInputEvent,
        undefined
      );

      expect(questionsRetrievalServiceSpy).toHaveBeenCalledWith(mockInputEvent);

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnits.Count,
        CompletionStatus.ERROR
      );

      const lambdaName = FetchQuestionsHandler.name;
      const errorText: string = "An error occured";
      const errorMessage = `${lambdaName} : ${errorText}`;
      const expectedResponse = { error: errorMessage };

      expect(lambdaResponse).toEqual(expectedResponse);
    });
  });
});
