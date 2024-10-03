import { SaveQuestionsService } from "../../src/services/save-questions-service";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import {
  Question,
  QuestionResultItemInfo,
  QuestionResultItemQuestion,
} from "../../src/types/questions-result-types";
import { mock } from "jest-mock-extended";

const questionKey = "testkey";
const currentTaxYear = "testcurrentTaxYear";
const previousTaxYear = "testpreviousTaxYear";

describe("SaveQuestionsService", () => {
  process.env.QUESTIONS_TABLE_NAME = "QUESTIONS_TABLE_NAME";
  let service: SaveQuestionsService;

  const mockDynamoDocument = mock<DynamoDBDocument>();

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SaveQuestionsService(mockDynamoDocument);
  });

  it("should save questions", async () => {
    const questionResultItemInfo: QuestionResultItemInfo =
      new QuestionResultItemInfo(currentTaxYear, previousTaxYear);

    const questionResultItemQuestion: QuestionResultItemQuestion =
      new QuestionResultItemQuestion(
        questionKey,
        questionResultItemInfo,
        false,
        0
      );

    const questionsResultItem = {
      sessionId: "sessionId",
      correlationId: "correlationId",
      expiryDate: 1234,
      questions: [questionResultItemQuestion],
    };
    const questions: Question[] = [
      new Question(questionKey, currentTaxYear, previousTaxYear),
    ];

    const result = await service.saveQuestions(
      "sessionId",
      1234,
      "correlationId",
      questions
    );

    expect(mockDynamoDocument.send).toHaveBeenCalledTimes(1);
    expect(mockDynamoDocument.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Item: expect.objectContaining(questionsResultItem),
          TableName: "QUESTIONS_TABLE_NAME",
        }),
      })
    );
    expect(result).toBe(true);
  });

  it("should return exisitng item from questions table", async () => {
    const sessionId: any = "sessionId";

    service.getExistingSavedItem(sessionId);

    const expected = {
      input: {
        Key: { sessionId: "sessionId" },
        TableName: "QUESTIONS_TABLE_NAME",
      },
    };

    expect(mockDynamoDocument.send).toHaveBeenCalledWith(
      expect.objectContaining(expected)
    );
  });
});
