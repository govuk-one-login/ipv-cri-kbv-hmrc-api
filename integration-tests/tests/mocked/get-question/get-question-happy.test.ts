import { HistoryEvent } from "@aws-sdk/client-sfn";
import { SfnContainerHelper } from "./sfn-container-helper";

describe("get-question-happy", () => {
  let sfnContainer: SfnContainerHelper;

  beforeAll(async () => {
    sfnContainer = new SfnContainerHelper();
  });

  afterAll(async () => sfnContainer.shutDown());

  it("has a step-function docker container running", async () => {
    expect(sfnContainer.getContainer()).toBeDefined();
  });

  it("should get unanswered questions", async () => {
    const input = JSON.stringify({
      sessionId: "12345",
    });
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "HappyPathTest",
      input
    );
    const results = await sfnContainer.waitFor(
      (event: HistoryEvent) =>
        event?.stateExitedEventDetails?.name === "Return Next Question",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual(
      '{"questionKey":{"S":"ita-bankaccount"},"answered":{"S":"false"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d572"},"sessionId":{"S":"12345"},"info":{"M":{}}}'
    );
  });

  it("should 204 when questions are already loaded", async () => {
    const input = JSON.stringify({
      sessionId: "12345",
    });
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "204WhenNoQuestionsLeft",
      input
    );
    const results = await sfnContainer.waitFor(
      (event: HistoryEvent) =>
        event?.stateExitedEventDetails?.name === "204: No More Questions",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual("204");
  });
});
