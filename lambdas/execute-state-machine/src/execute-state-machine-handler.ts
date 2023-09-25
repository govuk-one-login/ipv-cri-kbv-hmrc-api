import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";
import { fromEnv } from "@aws-sdk/credential-providers";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger();

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
      logger.error(`State machine execution failed: ${error}`);
      throw error;
    }
  }
}

const handlerClass = new ExecuteStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);

type StateMachineProps = {
  stateMachineArn: string;
  input: any;
};
