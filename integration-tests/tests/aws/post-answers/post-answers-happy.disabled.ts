import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("post-answers-happy", () => {
  const stateMachineInput = {
    key: "rti-p60-employee-ni-contributions",
    value: "100.30",
    sessionId: "post-answers-happy",
  };
  const testUser = {
    sessionId: "post-answers-happy",
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
    await clearItems(output.PersonalIdentityTable as string, {
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
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d574",
      questionKey: "rti-payslip-income-tax",
      info: {
        months: "3",
      },
    },
  ] as any;

  let output: Partial<{
    PersonalIdentityTable: string;
    QuestionsTable: string;
    PostAnswerStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(testUser, output.PersonalIdentityTable);
  });

  afterEach(async () => {
    await clearPersonalIdentityTable(testUser.sessionId);
    await clearQuestionDB();
  });

  it("should pass and not post the answers to HMRC when there are unanswered questions", async () => {
    for (const question of testQuestions) {
      await populateTable(question, output.QuestionsTable);
    }
    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.PostAnswerStateMachineArn
    )) as any;

    expect(startExecutionResult.output).toBe("{}");
  });

  it.skip("should pass and post the answers to HMRC when there are no unanswered questions", async () => {
    for (const question of testQuestions) {
      if (question.questionKey !== stateMachineInput.key) {
        question.answered = "true";
      }

      await populateTable(question, output.QuestionsTable);
    }
    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.PostAnswerStateMachineArn
    )) as any;

    expect(startExecutionResult.output).toBe("{}");
  });
});
