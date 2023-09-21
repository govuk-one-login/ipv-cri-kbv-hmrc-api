import {
  CloudFormationClient,
  DescribeStacksCommand,
  Output,
} from "@aws-sdk/client-cloudformation";

const cfnClient = new CloudFormationClient({
  region: process.env.AWS_REGION,
});

export const stackOutputs = async (
  stackName?: string
): Promise<{ [key: string]: string }> => {
  if (!stackName) {
    throw new Error("Stack name not provided.");
  }

  const response = await cfnClient.send(
    new DescribeStacksCommand({
      StackName: stackName,
    })
  );

  const stackOutputs = response?.Stacks?.at(0)?.Outputs ?? [];
  return stackOutputs.reduce(
    (acc: { [key: string]: string }, output: Output) => {
      acc[output?.OutputKey as string] = output.OutputValue as string;
      return acc;
    },
    {}
  );
};
