import { SubmitAnswerHandler } from "../src/submit-answer-handler";
import { Context } from "aws-lambda";

describe("submit-answer-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("happy path scenarios", () => {
    it("it should return the response from the HMRC API", async () => {
      const hmrcResponse = {};
      global.fetch = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(hmrcResponse),
      });
      const submitAnswerHandler = new SubmitAnswerHandler();
      const result = await submitAnswerHandler.handler(
        {
          nino: "good-nino",
          parameters: {
            url: "testUrl",
            userAgent: "testUserAgent",
          },
          oAuthToken: {
            value: "testOAuthToken",
          },
          questions: {
            Items: [
              {
                correlationId: {
                  S: "testCorrelationId",
                },
                questionKey: {
                  S: "testQuestionKey",
                },
                answer: {
                  S: "testAnswer",
                },
              },
            ],
          },
        },
        {} as Context
      );
      expect(result).toEqual(hmrcResponse);
    });
  });

  describe("unhappy path scenarios", () => {
    it("it should return response text when HMRC error is not JSON", async () => {
      const hmrcResponse = "Bad request";
      global.fetch = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValueOnce(hmrcResponse),
      });
      const submitAnswerHandler = new SubmitAnswerHandler();
      const response = await submitAnswerHandler.handler(
        {
          nino: "good-nino",
          parameters: {
            url: "testUrl",
            userAgent: "testUserAgent",
          },
          oAuthToken: {
            value: "badOAuthToken",
          },
          questions: {
            Items: [
              {
                correlationId: {
                  S: "testCorrelationId",
                },
                questionKey: {
                  S: "testQuestionKey",
                },
                answer: {
                  S: "testAnswer",
                },
              },
            ],
          },
        },
        {} as Context
      );
      expect(response).toEqual(hmrcResponse);
    });

    it("it should throw on error when trying to call the API", async () => {
      const submitAnswerHandler = new SubmitAnswerHandler();
      await expect(
        submitAnswerHandler.handler(
          {
            nino: "good-nino",
            parameters: {
              url: "testUrl",
              userAgent: "testUserAgent",
            },
            oAuthToken: {
              value: "badOAuthToken",
            },
            questions: {
              Items: [
                {
                  correlationId: {
                    S: "testCorrelationId",
                  },
                  questionKey: {
                    S: "testQuestionKey",
                  },
                  answer: {
                    S: "testAnswer",
                  },
                },
              ],
            },
          },
          {} as Context
        )
      ).rejects.toThrow();
    });
  });
});
