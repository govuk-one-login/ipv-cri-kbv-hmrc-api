import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";
import { fromEnv } from "@aws-sdk/credential-providers";

const sfnClient = new SFNClient({
  region: process.env["AWS_REGION"],
  credentials: fromEnv(),
});

export class ExecuteStateMachineHandler implements LambdaInterface {
  public async handler(
    event: any,
    _context: unknown
  ): Promise<string | undefined> {
    const body = event as unknown as StateMachineProps;
    try {
      const startMachineCommand = new StartSyncExecutionCommand({
        stateMachineArn: body.stateMachineArn,
        input: JSON.stringify(body.input),
      });
      const response = await sfnClient.send(startMachineCommand);
      return response.output;
    } catch (error) {
      return `State machine execution failed: ${error}`;
    }
  }
}

const handlerClass = new ExecuteStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);

type StateMachineProps = {
  stateMachineArn: string;
  input: any;
};
