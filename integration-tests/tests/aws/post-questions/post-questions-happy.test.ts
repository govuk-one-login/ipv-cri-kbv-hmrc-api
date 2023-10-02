import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("HMRC KBV Post Question", () => {
  const stateMachineInput = {
    key: "rti-p60-employee-ni-contributions",
    value: "100.30",
    sessionId: "12345",
  };
  const testUser = {
    sessionId: "12345",
    nino: "AA000003D",
  };

  const clearQuestionDB = async (sessionId: string) => {
    await clearItems(output.PersonalIdenityTable as string, {
      sessionId: sessionId,
    });
    for (const question of testQuestions) {
      await clearItems(output.QuestionsTable as string, {
        sessionId: question.sessionId,
        questionKey: question.questionKey,
      });
    }
  };

  let testQuestions = [
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
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d575",
      questionKey: "rti-payslip-national-insurance",
      info: {
        months: "3",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d576",
      questionKey: "ita-bankaccount",
      info: {},
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d577",
      questionKey: "tc-amount",
      info: {},
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
  });

  afterEach(async () => {
    await clearQuestionDB(testUser.sessionId);
  });

  describe("Happy Path Journey", () => {
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

    it("should pass and post the answers to HMRC when there are no unanswered questions", async () => {
      for (const question of testQuestions) {
        if (question.questionKey === stateMachineInput.key) {
          question.answered = "false";
        } else {
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
});
