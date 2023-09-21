import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION,
});
export const executeStepFunction = async (
  input: Record<string, unknown>,
  stateMachineArn?: string
) => {
  return await sfnClient.send(
    new StartSyncExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
    })
  );
};
