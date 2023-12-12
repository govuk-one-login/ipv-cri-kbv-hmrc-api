import { FetchQuestionsHandler } from "../src/fetch-questions-handler";
import { Context } from "aws-lambda";

const smInput = {
  parameters: {
    url: "dummyUrl",
    userAgent: "dummyUserAgent",
  },
  bearerToken: {
    value: "dummyOAuthToken",
  },
  nino: "dummyNino",
};

describe("fetch-questions-handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Success Scenarios", () => {
    it("should return a set of questions for a valid nino", async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise((resolve, _reject) => {
          resolve({
            json: () => {
              return {
                correlationId: "dummyCorrelationId",
                questions: [
                  {
                    questionKey: "dummyQuestionKey",
                    info: {},
                  },
                  {
                    questionKey: "dummyQuestionKey1",
                    info: {
                      dummyChoice: "dummyChoice",
                    },
                  },
                ],
              };
            },
          });
        });
      });
    });
  });

  describe("Failure Scenarios", () => {
    it("Default values", async () => {
      const fetchQuestionsHandler = new FetchQuestionsHandler();
      const result = await fetchQuestionsHandler.handler(
        smInput,
        {} as Context
      );

      expect(result).toEqual({
        correlationId: "dummyCorrelationId",
        questions: [
          {
            questionKey: "dummyQuestionKey",
            info: {},
          },
          {
            questionKey: "dummyQuestionKey1",
            info: {
              dummyChoice: "dummyChoice",
            },
          },
        ],
      });
    });

    it("should throw an error when HMRC returns no questions", async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise((resolve, _reject) => {
          resolve({
            json: () => {
              return {
                correlationId: "dummyCorrelationId",
                questions: [],
              };
            },
          });
        });
      });

      await expect(() =>
        new FetchQuestionsHandler().handler(smInput, {} as Context)
      ).rejects.toThrow("No questions returned");
    });

    it("should throw an error when HMRC does not return valid JSON", async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise((resolve, _reject) => {
          resolve({
            text: () => {
              return "dummyText";
            },
          });
        });
      });

      await expect(() =>
        new FetchQuestionsHandler().handler(smInput, {} as Context)
      ).rejects.toThrow("dummyText");
    });
  });
});
