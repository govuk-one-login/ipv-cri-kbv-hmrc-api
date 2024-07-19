import { ResultsRetrievalService } from "../../src/services/results-retrieval-service";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const testAnswerResultHappy = {
  Item: {
    correlationId: "correlationId",
    ttl: 1234567890,
    answers: [
      {
        questionKey: "rti-p60-payment-for-year",
        answer: "correct",
      },
      {
        questionKey: "rti-payslip-income-tax",
        answer: "correct",
      },
      {
        questionKey: "sa-income-from-pensions",
        answer: "correct",
      },
    ],
  },
};

describe("ResultsRetrievalService", () => {
  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";
  let resultsService: ResultsRetrievalService;

  let dynamoDbDocument: DynamoDBDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    dynamoDbDocument = {
      send: jest.fn().mockReturnValue(Promise.resolve(testAnswerResultHappy)),
    } as unknown as DynamoDBDocument;

    resultsService = new ResultsRetrievalService(dynamoDbDocument);
  });

  it("should return exisitng item from results table", async () => {
    const result = resultsService.getResults("sessionId");

    expect(result).toBeDefined();
    expect(result).resolves.toEqual(testAnswerResultHappy);
  });
});
