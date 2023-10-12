import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("get-question", () => {
  const stateMachineInput = {
    sessionId: "12345",
    nino: "AA000003D",
  };

  const clearPersonalIdenityTable = async (sessionId: string) => {
    await clearItems(output.PersonalIdenityTable as string, {
      sessionId: sessionId,
    });
  };

  const clearQuestionDB = async () => {
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
      answer: "100.30",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-p60-payment-for-year",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      answer: "100.40",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      answer: "100.50",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-payslip-income-tax",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      answer: "100.60",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "rti-payslip-national-insurance",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      answer: "100.70",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "tc-amount",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      answer: "100.80",
      correlationId: "67b27ad0-53e3-4652-96a4-949d7d42b8e7",
      questionKey: "ita-bankaccount",
      info: {
        currentTaxYear: "2022/23",
      },
    },
  ] as any;

  let output: Partial<{
    PersonalIdenityTable: string;
    QuestionsTable: string;
    QuestionStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(stateMachineInput, output.PersonalIdenityTable);
  });

  afterEach(async () => {
    await clearPersonalIdenityTable(stateMachineInput.sessionId);
    await clearQuestionDB();
  });

  describe("Happy Path Journey", () => {
    describe("Questions already loaded in Dynamo DB", () => {
      it("should pass when user has unanswered questions", async () => {
        for (const question of testQuestions) {
          await populateTable(question, output.QuestionsTable);
        }
        const startExecutionResult = await executeStepFunction(
          stateMachineInput,
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.output).toBe(
          '{"questionKey":{"S":"ita-bankaccount"},"answered":{"S":"false"},"answer":{"S":"100.80"},"correlationId":{"S":"67b27ad0-53e3-4652-96a4-949d7d42b8e7"},"sessionId":{"S":"12345"},"info":{"M":{"currentTaxYear":{"S":"2022/23"}}}}'
        );
      });
      it("should return 204 when there are no unanswered left", async () => {
        for (let question of testQuestions) {
          question.answered = "true";
          await populateTable(question, output.QuestionsTable);
        }
        const startExecutionResult = await executeStepFunction(
          stateMachineInput,
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.output).toBe("204");
      });
    });

    describe("Questions fetched directly from HMRC", () => {
      it("should pass when trying to fetch questions first time", async () => {
        const startExecutionResult = await executeStepFunction(
          stateMachineInput,
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.status).toBe("SUCCEEDED");
      });
    });
  });
});
