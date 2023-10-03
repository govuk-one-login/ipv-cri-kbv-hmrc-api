import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("post-questions-unhappy", () => {
  const stateMachineInput = {
    key: "rti-p60-employee-ni-contributions",
    value: "100.30",
    sessionId: "12345",
  };
  const testUser = {
    sessionId: "12345",
    nino: "AA000003D",
  };

  const clearQuestionDB = async () => {
    for (const question of testQuestions) {
      await clearItems(output.QuestionsTable as string, {
        sessionId: question.sessionId,
        questionKey: question.questionKey,
      });
    }
  };

  const clearPersonalIdentityTable = async (sessionId: string) => {
    await clearItems(output.PersonalIdenityTable as string, {
      sessionId: sessionId,
    });
  };

  const testQuestions = [
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d572",
      questionKey: "rti-p60-payment-for-year",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d574",
      questionKey: "rti-payslip-income-tax",
      info: {
        months: "3",
      },
    },
  ] as any;

  let output: Partial<{
    PersonalIdenityTable: string;
    QuestionsTable: string;
    PostAnswerStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(testUser, output.PersonalIdenityTable);
    for (const question of testQuestions) {
      await populateTable(question, output.QuestionsTable);
    }
  });

  afterEach(async () => {
    await clearPersonalIdentityTable(testUser.sessionId);
    await clearQuestionDB();
  });

  it("should return error when provided question has already answered", async () => {
    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.PostAnswerStateMachineArn
    )) as any;

    expect(startExecutionResult.output).toBe("{}");
  });
  it("should return error when nino is not present", async () => {
    const startExecutionResult = (await executeStepFunction(
      {
        key: "rti-p60-employee-ni-contributions",
        value: "100.30",
        sessionId: "12346",
      },
      output.PostAnswerStateMachineArn
    )) as any;

    expect(startExecutionResult.output).toBe(
      '{"key":"rti-p60-employee-ni-contributions","value":"100.30","sessionId":"12346","nino":{"Count":0,"Items":[],"ScannedCount":0}}'
    );
  });
});
