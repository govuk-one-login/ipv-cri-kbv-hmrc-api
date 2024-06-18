import { stackOutputs } from "../resources/cloudformation-helper";
import {
  clearItems,
  populateTable,
  getTableItem,
} from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("post-ivq-answers", () => {
  const stateMachineInput = {
    sessionId: "post-ivq-answers-happy",
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
      answered: "true",
      answer: "100.30",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-p60-payment-for-year",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      answer: "100.40",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      answer: "100.50",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-payslip-income-tax",
      info: {
        months: "3",
      },
    },
  ] as any;

  let output: Partial<{
    PersonalIdentityTable: string;
    QuestionsTable: string;
    PostIvqAnswersStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
  });

  afterEach(async () => {
    await clearPersonalIdentityTable(stateMachineInput.sessionId);
    await clearQuestionDB();
  });

  it("should pass and store the results when all questions are answered", async () => {
    for (const question of testQuestions) {
      await populateTable(question, output.QuestionsTable);
    }
    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.PostIvqAnswersStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toBe("SUCCEEDED");

    for (const question of testQuestions) {
      const tableItem = (await getTableItem(output.QuestionsTable as string, {
        sessionId: question.sessionId,
        questionKey: question.questionKey,
      })) as any;
      expect(tableItem.Item.score.length).toBeGreaterThan(0);
    }
  });

  it("should pass and not store the results when all questions are not answered", async () => {
    for (const question of testQuestions) {
      question.answered = "false";
      await populateTable(question, output.QuestionsTable);
    }
    const startExecutionResult = (await executeStepFunction(
      stateMachineInput,
      output.PostIvqAnswersStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toBe("SUCCEEDED");

    for (const question of testQuestions) {
      const tableItem = (await getTableItem(output.QuestionsTable as string, {
        sessionId: question.sessionId,
        questionKey: question.questionKey,
      })) as any;
      expect(tableItem.Item).toEqual(question);
    }
  });
});
