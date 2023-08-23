import { ExecuteStateMachineHandler } from "../src/execute-state-machine-handler";
import { Context } from "aws-lambda";

describe("execute-state-machine-handler", () => {
  it("should print Hello, World!", async () => {
    const executeStateMachineHandler = new ExecuteStateMachineHandler();
    const result = await executeStateMachineHandler.handler({}, {} as Context);
    expect(result).toStrictEqual("Hello, World!");
  });
});
