import { FetchQuestionsHandler } from "../src/fetch-questions-handler";
import { Context } from "aws-lambda";

describe("fetch-questions-handler", () => {
  it("should print Hello, World!", async () => {
    const fetchQuestionsHandler = new FetchQuestionsHandler();
    const result = await fetchQuestionsHandler.handler({}, {} as Context);
    expect(result).toStrictEqual("Hello, World!");
  });
});
