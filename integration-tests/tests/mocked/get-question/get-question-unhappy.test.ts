import { HistoryEvent } from "@aws-sdk/client-sfn";
import { SfnContainerHelper } from "./sfn-container-helper";

jest.setTimeout(30_000);

describe("get-question-unhappy", () => {
  let sfnContainer: SfnContainerHelper;

  beforeAll(async () => {
    sfnContainer = new SfnContainerHelper();
  });

  afterAll(async () => sfnContainer.shutDown());

  it("has a step-function docker container running", async () => {
    expect(sfnContainer.getContainer()).toBeDefined();
  });

  it("should fail when session id is not present", async () => {
    const input = JSON.stringify({});
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "SessionIdNotPresent",
      input
    );
    const results = await sfnContainer.waitFor(
      (event: HistoryEvent) =>
        event?.type === "PassStateExited" &&
        event?.stateExitedEventDetails?.name === "Error: Missing sessionId",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual("{}");
  });

  it("should fail when nino is not present", async () => {
    const input = JSON.stringify({
      sessionId: "bad-session-id",
    });
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "NinoNotPresent",
      input
    );
    const results = await sfnContainer.waitFor(
      (event: HistoryEvent) =>
        event?.type === "PassStateExited" &&
        event?.stateExitedEventDetails?.name === "Error: Missing nino",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual(
      '{"sessionId":"bad-session-id","nino":{"Count":0,"Items":[],"ScannedCount":0}}'
    );
  });

  it("should return 204 when no questions left", async () => {
    const input = JSON.stringify({
      sessionId: "12345",
    });
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "204WhenNoQuestionsLeft",
      input
    );
    const results = await sfnContainer.waitFor(
      (event: HistoryEvent) =>
        event?.type === "PassStateExited" &&
        event?.stateExitedEventDetails?.name === "HTTP 204 NO CONTENT",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual(
      '{"Count":0,"Items":[],"ScannedCount":0}'
    );
  });
});
