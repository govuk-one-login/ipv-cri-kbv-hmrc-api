import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { FetchQuestionsHandler } from "../src/fetch-questions-handler";
import { Question, QuestionsResult } from "../src/types/questions-result-types";
import { QuestionsRetrievalService } from "../src/services/questions-retrieval-service";
import { SaveQuestionsService } from "../src/services/save-questions-service";
import { FilterQuestionsService } from "../src/services/filter-questions-service";
import { MetricsProbe } from "../src/../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/services/questions-retrieval-service");
jest.mock("../src/../../../lib/src/Service/metrics-probe");
jest.mock("../src/services/save-questions-service");
jest.mock("../src/services/filter-questions-service");

describe("FetchQuestionsHandler", () => {
  let fetchQuestionsHandler: FetchQuestionsHandler;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockQuestionsRetrievalService: jest.MockedObjectDeep<
    typeof QuestionsRetrievalService
  >;

  let mockSaveQuestionsService: jest.MockedObjectDeep<
    typeof SaveQuestionsService
  >;

  let mockFilterQuestionsService: jest.MockedObjectDeep<
    typeof FilterQuestionsService
  >;

  let questionsRetrievalServiceSpy: jest.SpyInstance;
  let mockMetricsProbeSpy: jest.SpyInstance;
  let saveQuestionsServicegetExistingSavedItemSpy: jest.SpyInstance;
  let saveQuestionsServiceSaveQuestionsSpy: jest.SpyInstance;
  let filterQuestionsServiceSpy: jest.SpyInstance;

  const mockInputEvent = {
    sessionId: "sessionId",
    sessionItem: {
      Item: {
        expiryDate: {
          N: "1234",
        },
      },
    },
  };

  const mockInputContext = {
    invokedFunctionArn: "test",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);
    mockQuestionsRetrievalService = jest.mocked(QuestionsRetrievalService);
    mockSaveQuestionsService = jest.mocked(SaveQuestionsService);
    mockFilterQuestionsService = jest.mocked(FilterQuestionsService);

    questionsRetrievalServiceSpy = jest.spyOn(
      mockQuestionsRetrievalService.prototype,
      "retrieveQuestions"
    );

    saveQuestionsServicegetExistingSavedItemSpy = jest.spyOn(
      mockSaveQuestionsService.prototype,
      "getExistingSavedItem"
    );

    filterQuestionsServiceSpy = jest.spyOn(
      mockFilterQuestionsService.prototype,
      "filterQuestions"
    );

    saveQuestionsServiceSaveQuestionsSpy = jest.spyOn(
      mockSaveQuestionsService.prototype,
      "saveQuestions"
    );

    mockMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureMetric"
    );

    fetchQuestionsHandler = new FetchQuestionsHandler(
      mockMetricsProbe.prototype,
      mockQuestionsRetrievalService.prototype,
      mockSaveQuestionsService.prototype,
      mockFilterQuestionsService.prototype
    );
  });

  describe("Success Scenarios", () => {
    it.each([
      [[]], // Zero questions
      [
        [
          new Question("rti-p60-payment-for-year", undefined, undefined),
          new Question("sa-payment-details", "2021/2022", "2020/2021"),
        ],
      ],
      [
        [
          new Question("rti-p60-payment-for-year", undefined, undefined),
          new Question("sa-payment-details", "2021/2022", "2020/2021"),
          new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
        ],
      ],
    ])(
      "should return fetchQuestionsState for a valid nino when a question request is successful",
      async (questions: Question[]) => {
        const correlationId: string = "test-correlsation-id";
        const questionCount: number = questions.length;

        const mockQuestionsRetrievalServiceResponse = new QuestionsResult(
          correlationId,
          questions
        );

        questionsRetrievalServiceSpy.mockResolvedValue(
          mockQuestionsRetrievalServiceResponse
        );

        filterQuestionsServiceSpy.mockResolvedValue(questions);

        // No previously saved questions
        saveQuestionsServicegetExistingSavedItemSpy.mockResolvedValue(
          undefined
        );

        saveQuestionsServiceSaveQuestionsSpy.mockResolvedValue(true);

        const lambdaResponse = await fetchQuestionsHandler.handler(
          mockInputEvent,
          mockInputContext
        );

        expect(questionsRetrievalServiceSpy).toHaveBeenCalledWith(
          mockInputEvent
        );

        expect(
          saveQuestionsServicegetExistingSavedItemSpy
        ).toHaveBeenCalledWith(mockInputEvent.sessionId);

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnit.Count,
          CompletionStatus.OK
        );

        // Response
        let expectedState: string;
        if (questionCount < 2) {
          expectedState = "InsufficientQuestions";
        } else {
          expectedState = "SufficientQuestions";
        }

        const expectedResponse = {
          fetchQuestionsState: `${expectedState}`,
        };

        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );
  });

  describe("Recovery Scenarios", () => {
    it.each(["SavedWithQuestions", "SavedWithNoQuestions"])(
      "should return fetchQuestionsState for a valid nino when a question request is already saved",
      async (scenario: string) => {
        const savedResult = {
          correlationId: "test-correlationId",
          questions: [
            {
              questionKey: "rti-p60-payment-for-year",
              order: 1,
            },
            {
              questionKey: "sa-payment-details",
              order: 2,
            },
            {
              questionKey: "rti-p60-statutory-adoption-pay",
              order: 3,
            },
          ],
        };

        if (scenario == "SavedWithNoQuestions") {
          savedResult.questions = [];
        }

        // No previously saved questions
        saveQuestionsServicegetExistingSavedItemSpy.mockResolvedValue({
          Item: savedResult,
        });

        saveQuestionsServiceSaveQuestionsSpy.mockResolvedValue(true);

        const lambdaResponse = await fetchQuestionsHandler.handler(
          mockInputEvent,
          mockInputContext
        );

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnit.Count,
          CompletionStatus.OK
        );

        // Response
        let expectedState: string;
        if (savedResult.questions.length == 0) {
          expectedState = "InsufficientQuestions";
        } else {
          expectedState = "ContinueSufficientQuestionAlreadyRetrieved";
        }

        const expectedResponse = {
          fetchQuestionsState: `${expectedState}`,
        };

        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );
  });

  describe("Failure Scenarios", () => {
    it("should return an error if there is an issue during question retrieval ", async () => {
      // No previously saved questions
      saveQuestionsServicegetExistingSavedItemSpy.mockResolvedValue(undefined);

      questionsRetrievalServiceSpy.mockImplementation(() => {
        const testErrorMessage: string = "An error occured";
        throw new Error(testErrorMessage);
      });

      const lambdaResponse = await fetchQuestionsHandler.handler(
        mockInputEvent,
        mockInputContext
      );

      expect(questionsRetrievalServiceSpy).toHaveBeenCalledWith(mockInputEvent);

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      const lambdaName = FetchQuestionsHandler.name;
      const errorText: string = "An error occured";
      const errorMessage = `${lambdaName} : ${errorText}`;
      const expectedResponse = { error: errorMessage };

      expect(lambdaResponse).toEqual(expectedResponse);
    });

    it("should return an error if there is an issue during question save ", async () => {
      const correlationId: string = "test-correlsation-id";

      const mockQuestionsRetrievalServiceResponse = new QuestionsResult(
        correlationId,
        [
          new Question("rti-p60-payment-for-year", undefined, undefined),
          new Question("sa-payment-details", "2021/2022", "2020/2021"),
          new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
        ]
      );

      questionsRetrievalServiceSpy.mockResolvedValue(
        mockQuestionsRetrievalServiceResponse
      );

      // No previously saved questions
      saveQuestionsServicegetExistingSavedItemSpy.mockResolvedValue(undefined);

      saveQuestionsServiceSaveQuestionsSpy.mockImplementation(() => {
        const testErrorMessage: string = "An error occured";
        throw new Error(testErrorMessage);
      });

      const lambdaResponse = await fetchQuestionsHandler.handler(
        mockInputEvent,
        mockInputContext
      );

      expect(questionsRetrievalServiceSpy).toHaveBeenCalledWith(mockInputEvent);
      expect(saveQuestionsServiceSaveQuestionsSpy).toHaveBeenCalledWith(
        mockInputEvent.sessionId,
        Number(mockInputEvent.sessionItem.Item.expiryDate.N),
        correlationId,
        mockQuestionsRetrievalServiceResponse.questions
      );

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
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
