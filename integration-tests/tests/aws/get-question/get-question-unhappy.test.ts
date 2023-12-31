import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("get-question-unhappy", () => {
  const testUser = {
    sessionId: "123456",
    nino: "AA000003D",
  };

  const testQuestions = [
    {
      sessionId: "123456",
      questionKey: "ita-bankaccount",
      answered: "true",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d572",
      info: new Map(),
    },
    {
      sessionId: "123456",
      questionKey: "ita-bankaccount2",
      answered: "true",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      info: new Map(),
    },
  ];

  let output: Partial<{
    PersonalIdentityTable: string;
    QuestionsTable: string;
    QuestionStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(testUser, output.PersonalIdentityTable);
    for (const question of testQuestions) {
      await populateTable(question, output.QuestionsTable);
    }
  });

  afterEach(async () => {
    await clearItems(output.PersonalIdentityTable as string, {
      sessionId: testUser.sessionId,
    });
    for (const question of testQuestions) {
      await clearItems(output.QuestionsTable as string, {
        sessionId: question.sessionId,
        questionKey: question.questionKey,
      });
    }
  });

  describe("Invalid state machine input", () => {
    it("should fail when there is no sessionId present", async () => {
      const startExecutionResult = await executeStepFunction(
        {},
        output.QuestionStateMachineArn
      );
      expect(startExecutionResult.status).toBe("FAILED");
    });
  });
});
