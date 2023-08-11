import { SubmitAnswerHandler } from "../src/submit-answer-handler";
import { Context } from "aws-lambda";

describe("submit-answer-handler", () => {
  it("should print Hello, World!", async () => {
    const submitAnswerHandler = new SubmitAnswerHandler();
    const result = await submitAnswerHandler.handler({}, {} as Context);
    expect(result).toStrictEqual("Hello, World!");
  });
});
