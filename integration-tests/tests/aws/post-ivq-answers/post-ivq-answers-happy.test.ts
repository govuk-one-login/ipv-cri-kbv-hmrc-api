import { stackOutputs } from "../resources/cloudformation-helper";
import { clearItems, populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

describe("post-ivq-answers-happy", () => {
  const stateMachineInput = {
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

  let testQuestions = [
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      answer: "100.30",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d572",
      questionKey: "rti-p60-payment-for-year",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      answer: "100.40",
      correlationId: "93dcc67c-fe6d-4bd7-b68f-2bd848e0d573",
      questionKey: "rti-p60-employee-ni-contributions",
      info: {
        currentTaxYear: "2022/23",
      },
    },
    {
      sessionId: stateMachineInput.sessionId,
      answered: "true",
      answer: "100.50",
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
    PostIvqAnswersStateMachineArn: string;
  }>;

  beforeEach(async () => {
    output = await stackOutputs(process.env.STACK_NAME);
    await populateTable(stateMachineInput, output.PersonalIdenityTable);
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

    const results = JSON.parse(startExecutionResult.output);

    for (const result of results) {
      expect(result.SdkHttpMetadata.HttpStatusCode).toBe(200);
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

    expect(startExecutionResult.output).toBe(
      '{"sessionId":"12345","nino":"AA000003D","questions":{"Count":3,"Items":[{"questionKey":{"S":"rti-p60-employee-ni-contributions"},"answered":{"S":"false"},"answer":{"S":"100.40"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d573"},"sessionId":{"S":"12345"},"info":{"M":{"currentTaxYear":{"S":"2022/23"}}}},{"questionKey":{"S":"rti-p60-payment-for-year"},"answered":{"S":"false"},"answer":{"S":"100.30"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d572"},"sessionId":{"S":"12345"},"info":{"M":{"currentTaxYear":{"S":"2022/23"}}}},{"questionKey":{"S":"rti-payslip-income-tax"},"answered":{"S":"false"},"answer":{"S":"100.50"},"correlationId":{"S":"93dcc67c-fe6d-4bd7-b68f-2bd848e0d574"},"sessionId":{"S":"12345"},"info":{"M":{"months":{"S":"3"}}}}],"ScannedCount":3}}'
    );
  });
});
