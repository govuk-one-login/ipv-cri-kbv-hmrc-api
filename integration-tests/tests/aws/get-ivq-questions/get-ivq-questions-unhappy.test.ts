import { stackOutputs } from "../resources/cloudformation-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";
import {
  getSSMParamter,
  ssmParamterUpdate,
} from "../resources/ssm-param-helper";

describe("get-ivq-questions-unhappy", () => {
  const stateMachineInput = {
    sessionId: "12346",
    nino: "AA000003D",
  };

  let output: Partial<{
    IvqQuestionStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
  });

  it("should throw an error when url is unavailable", async () => {
    const urlParameterName = `/${process.env.STACK_NAME}/QuestionsUrl`;

    const currentURL = (await getSSMParamter({
      Name: urlParameterName,
    })) as any;

    await ssmParamterUpdate({
      Name: urlParameterName,
      Value: "bad-url",
      Type: "String",
      Overwrite: true,
    });

    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.IvqQuestionStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");

    await ssmParamterUpdate({
      Name: urlParameterName,
      Value: currentURL.Parameter.Value,
      Type: "String",
      Overwrite: true,
    });
  });
});
