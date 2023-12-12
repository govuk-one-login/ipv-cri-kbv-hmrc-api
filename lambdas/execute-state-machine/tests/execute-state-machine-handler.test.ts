import { ExecuteStateMachineHandler } from "../src/execute-state-machine-handler";
import { Context } from "aws-lambda";

describe("execute-state-machine-handler", () => {
  // TODO: Not a unit test as it requires AWS credentials
  it.skip("should print Hello, World!", async () => {
    const executeStateMachineHandler = new ExecuteStateMachineHandler();
    const result = await executeStateMachineHandler.handler({}, {} as Context);
    expect(result).toStrictEqual("Hello, World!");
  });
});
