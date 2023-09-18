import { HistoryEvent } from "@aws-sdk/client-sfn";
import { SfnContainerHelper } from "./sfn-container-helper";

jest.setTimeout(30_000);

describe("step-function-local", () => {
  describe("HMRC KBV Get Questions", () => {
    let stnContainerHelper: SfnContainerHelper;
    describe("is successful", () => {
      beforeAll(async () => {
        stnContainerHelper = new SfnContainerHelper();
      });
      afterAll(async () => stnContainerHelper.shutDown());
      it("has a container is running", async () => {
        expect(stnContainerHelper.getContainer()).toBeDefined();
      });

      describe("happy Case Scenario", () => {
        // xit("questions already loaded");
        // xit("insufficeint question");
        // xit("lambda throws exception");

        it("should get unanswered questions", async () => {
          const input = JSON.stringify({
            sessionId: "12345",
          });

          const responseStepFunction =
            await stnContainerHelper.startStepFunctionExecution(
              "HappyPathTest",
              input
            );
          const results = await stnContainerHelper.waitFor(
            (event: HistoryEvent) =>
              event?.stateExitedEventDetails?.name === "HTTP 200",
            responseStepFunction
          );

          expect(results[0].stateExitedEventDetails?.output).toEqual(
            '{"questionKey":{"S":"ita-bankaccount"},"answered":{"S":"false"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d572"},"sessionId":{"S":"12345"},"info":{"M":{}}}'
          );
        });
      });

      describe("unhappy Case Scenario", () => {
        describe("Invalid Request Received", () => {
          it("should fail when session id not present", async () => {
            const input = JSON.stringify({});

            const responseStepFunction =
              await stnContainerHelper.startStepFunctionExecution(
                "SessionIdNotPresent",
                input
              );
            const results = await stnContainerHelper.waitFor(
              (event: HistoryEvent) =>
                event?.type === "PassStateExited" &&
                event?.stateExitedEventDetails?.name ===
                  "Error: Missing sessionId",
              responseStepFunction
            );

            expect(results[0].stateExitedEventDetails?.output).toEqual("{}");
          });
          it("should fail when nino not present", async () => {
            const input = JSON.stringify({
              sessionId: "bad-session-id",
            });

            const responseStepFunction =
              await stnContainerHelper.startStepFunctionExecution(
                "NinoNotPresent",
                input
              );
            const results = await stnContainerHelper.waitFor(
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

            const responseStepFunction =
              await stnContainerHelper.startStepFunctionExecution(
                "204WhenNoQuestionsLeft",
                input
              );
            const results = await stnContainerHelper.waitFor(
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
      });
    });
  });
});
