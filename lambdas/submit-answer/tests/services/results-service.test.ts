import { ResultsService } from "../../src/services/results-service";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { mock } from "jest-mock-extended";
import { VerificationScoreCalculator } from "../../src/utils/verification-score-calculator";
import {
  AnswerResultItem,
  SubmitAnswerResult,
} from "../../src/types/answer-result-types";

describe(ResultsService, () => {
  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";
  let service: ResultsService;

  const mockDynamoDocument = mock<DynamoDBDocument>();
  const verificationScoreCalculator = new VerificationScoreCalculator();

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ResultsService(mockDynamoDocument);
  });

  it("should save results", async () => {
    const submitAnswerResultArray: SubmitAnswerResult[] = [
      new SubmitAnswerResult("questionKey1", "correct"),
      new SubmitAnswerResult("questionKey2", "incorrect"),
    ];

    const answerResultItem: AnswerResultItem = new AnswerResultItem(
      "sessionId",
      "correlationId",
      1234,
      submitAnswerResultArray,
      verificationScoreCalculator.calculateVerificationScore(
        submitAnswerResultArray
      ),
      2,
      1
    );

    const result = await service.saveResults(
      "sessionId",
      "correlationId",
      1234,
      submitAnswerResultArray,
      verificationScoreCalculator.calculateVerificationScore(
        submitAnswerResultArray
      ),
      2,
      1
    );

    expect(mockDynamoDocument.send).toHaveBeenCalledTimes(1);
    expect(mockDynamoDocument.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Item: expect.objectContaining(answerResultItem),
          TableName: "RESULTS_TABLE_NAME",
        }),
      })
    );
    expect(result).toBe(true);
  });

  it("should return exisitng item from questions table", async () => {
    const sessionId: any = "sessionId";

    service.getResults(sessionId);

    const expected = {
      input: {
        Key: { sessionId: "sessionId" },
        TableName: "RESULTS_TABLE_NAME",
      },
    };

    expect(mockDynamoDocument.send).toHaveBeenCalledWith(
      expect.objectContaining(expected)
    );
  });
});
