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

  it("should fail when nino is not present", async () => {
    const input = JSON.stringify({
      sessionId: "bad-session-id",
    });
    const responseStepFunction = await sfnContainer.startStepFunctionExecution(
      "NinoNotPresent",
      input
    );
    const results = await sfnContainer.waitForAllEvents(responseStepFunction);
    expect(results?.length).toBeGreaterThan(0);
    expect(results?.[results?.length - 1].type).toEqual("ExecutionFailed");
    expect(
      results?.[results?.length - 1].executionFailedEventDetails?.cause
    ).toEqual("No NINO found for given session-id");
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
        event?.stateExitedEventDetails?.name === "204: No More Questions",
      responseStepFunction
    );
    expect(results[0].stateExitedEventDetails?.output).toEqual("204");
  });
});
