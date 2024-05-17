import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

jest.setTimeout(10_000);

describe("get-ivq-questions-happy", () => {
  const stateMachineInput = {
    sessionId: "12346",
    nino: "AA000003D",
  };

  const clearQuestionDB = async () => {
    for (const question of testQuestions) {
      await clearItems(output.QuestionsTable as string, {
        sessionId: stateMachineInput.sessionId,
        questionKey: question.questionKey,
      });
    }
  };

  const testQuestions = [
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d572",
      questionKey: "rti-p60-payment-for-year",
      info: {
        currentTaxYear: "2023/24",
        previousTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2023/24",
        previousTaxYear: "2022/23",
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
    QuestionsTable: string;
    IvqQuestionStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
  });

  afterEach(async () => {
    await clearQuestionDB();
  });

  describe("Happy Path Journey", () => {
    it("should fetch questions from HMRC when there are no questions in DB", async () => {
      const startExecutionResult = (await executeStepFunction(
        stateMachineInput,
        output.IvqQuestionStateMachineArn
      )) as any;
      const result = JSON.parse(startExecutionResult.output);
      const fetchedQuestion = result.Payload.questions;
      for (let counter = 0; counter < testQuestions.length; counter++) {
        expect(testQuestions[counter].questionKey).toBe(
          fetchedQuestion[counter].questionKey
        );
        expect(testQuestions[counter].info).toEqual(
          fetchedQuestion[counter].info
        );
      }
    });
    it("should not fetch questions from HMRC when there are questions in DB", async () => {
      for (const question of testQuestions) {
        await populateTable(question, output.QuestionsTable);
      }
      const startExecutionResult = (await executeStepFunction(
        stateMachineInput,
        output.IvqQuestionStateMachineArn
      )) as any;
      const result = JSON.parse(startExecutionResult.output);
      const loadedQuestion: Array<String> = result.loadedQuestions.Items;
      for (let counter = 0; counter < testQuestions.length; counter++) {
        expect(loadedQuestion.includes(testQuestions[counter].questionKey));
        expect(loadedQuestion.includes(testQuestions[counter].info.months));
        expect(
          loadedQuestion.includes(testQuestions[counter].info.currentTaxYear)
        );
      }
    });
  });
});
