import { CheckDetailsHandler } from "../src/check-details-handler";
import { QuestionInfo, Response } from "../src/question-info-event";

describe("evidence-check-details-handler", () => {
  const mockEvent: Response<QuestionInfo> = {
    questionResponseEvent: {
      Count: 0,
    },
  };

  describe("payload questions items does not exist", () => {
    it.each([undefined, null, []])(
      "'%s' should return empty array []",
      async (items) => {
        const handler = new CheckDetailsHandler();

        mockEvent.questionResponseEvent.Items = items;
        const result = await handler.handler(mockEvent, {} as unknown);
        expect(result).toEqual([]);
      }
    );
  });
  describe("payload question items contain empty elements", () => {
    it.each([[undefined], [null]])(
      "'%s' should return empty array []",
      async (items) => {
        const handler = new CheckDetailsHandler();

        mockEvent.questionResponseEvent.Items = items;
        const result = await handler.handler(mockEvent, {} as unknown);
        expect(result).toEqual([]);
      }
    );
  });
  describe("payload question items with answers", () => {
    it("all correct should return all checkDetails objects", async () => {
      mockEvent.questionResponseEvent.Items = [
        {
          score: { S: "correct" },
        } as QuestionInfo,
        {
          score: { S: "correct" },
        } as QuestionInfo,
      ];

      const handler = new CheckDetailsHandler();
      const result = await handler.handler(mockEvent, {} as unknown);

      expect(result.length).toBe(2);
      expect(result).toEqual([
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
          kbvQuality: 3,
        },
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
          kbvQuality: 3,
        },
      ]);
    });
    it("all incorrect should return all failedCheckDetails objects", async () => {
      mockEvent.questionResponseEvent.Items = [
        {
          score: { S: "incorrect" },
        } as QuestionInfo,
        {
          score: { S: "incorrect" },
        } as QuestionInfo,
      ];

      const handler = new CheckDetailsHandler();
      const result = await handler.handler(mockEvent, {} as unknown);

      expect(result.length).toBe(2);
      expect(result).toEqual([
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
        },
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
        },
      ]);
    });
    it("should return 2 checkDetail and 1 failedCheckDetails objects", async () => {
      mockEvent.questionResponseEvent.Items = [
        {
          score: { S: "incorrect" },
        },
        {
          score: { S: "correct" },
        } as QuestionInfo,
        {
          score: { S: "correct" },
        } as QuestionInfo,
      ];

      const handler = new CheckDetailsHandler();
      const result = await handler.handler(mockEvent, {} as unknown);

      expect(result.length).toBe(3);
      expect(result).toEqual([
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
        },
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
          kbvQuality: 3,
        },
        {
          checkMethod: "kbv",
          kbvResponseMode: "free_text",
          kbvQuality: 3,
        },
      ]);
    });
  });

  describe("errors", () => {
    it("errors when questionResponseEvent items not an array", async () => {
      const handler = new CheckDetailsHandler();
      mockEvent.questionResponseEvent.Items = {};
      await expect(async () =>
        handler.handler(mockEvent, {} as unknown)
      ).rejects.toThrowError("questionItems?.map is not a function");
    });
  });
});
