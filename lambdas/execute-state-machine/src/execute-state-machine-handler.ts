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
    console.log(event);
    const body = event as unknown as {
      stateMachineArn: string;
      input: any;
    };
    try {
      const startMachineCommand = new StartSyncExecutionCommand({
        stateMachineArn: body.stateMachineArn,
        input: JSON.stringify(body.input),
      });
      const response = await sfnClient.send(startMachineCommand);
      return response.output;
    } catch (error) {
      console.log(error);
      return `Failed ${error}`;
    }
  }
}

const handlerClass = new ExecuteStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
