import { stackOutputs } from "./resources/cloudformation-helper";
import { clearItems, populateTable } from "./resources/dynamodb-helper";
import { executeStepFunction } from "./resources/stepfunction-helper";

describe("HMRC KBV Get Question", () => {
  const stateMachineInput = {
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

  const testQuestions = [
    {
      sessionId: "12345",
      questionKey: "ita-bankaccount",
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d572",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: "12345",
      questionKey: "ita-bankaccount2",
      answered: "false",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      info: new Map(),
    },
  ];

  let output: Partial<{
    PersonalIdenityTable: string;
    QuestionsTable: string;
    QuestionStateMachineArn: string;
  }>;
  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(testUser, output.PersonalIdenityTable);
    for (const question of testQuestions) {
      await populateTable(question, output.QuestionsTable);
    }
  });

  afterEach(async () => {
    await clearQuestionDB(testUser.sessionId);
  });

  describe("Happy Path Journey", () => {
    describe("Questions already loaded in Dynamo DB", () => {
      it("should pass when user has unanswered questions", async () => {
        const startExecutionResult = await executeStepFunction(
          stateMachineInput,
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.output).toBe(
          '{"questionKey":{"S":"ita-bankaccount"},"answered":{"S":"false"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d572"},"sessionId":{"S":"12345"},"info":{"M":{"currentTaxYear":{"S":"2022/23"}}}}'
        );
      });
      it("should return 204 when there are no unanswered left", async () => {
        const startExecutionResult = await executeStepFunction(
          {
            sessionId: "123456",
          },
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.output).toBe(
          '{"sessionId":"123456","nino":{"Count":0,"Items":[],"ScannedCount":0}}'
        );
      });
    });

    describe("Questions fetched directly from HMRC", () => {
      it("should pass when trying to fetch questions first time", async () => {
        const testUser = {
          sessionId: "12347",
          nino: "AA000003D",
        };

        const startExecutionResult = await executeStepFunction(
          stateMachineInput,
          output.QuestionStateMachineArn
        );
        expect(startExecutionResult.output).toBe(
          '{"questionKey":{"S":"ita-bankaccount"},"answered":{"S":"false"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d572"},"sessionId":{"S":"12345"},"info":{"M":{"currentTaxYear":{"S":"2022/23"}}}}'
        );
        await clearQuestionDB(testUser.sessionId);
      });
    });
  });
});
