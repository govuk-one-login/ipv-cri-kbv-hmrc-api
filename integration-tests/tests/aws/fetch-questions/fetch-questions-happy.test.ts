import { v4 as uuidv4 } from "uuid";
import { stackOutputs } from "../resources/cloudformation-helper";
import { populateTable, getTableItem } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";

jest.setTimeout(20_000);

describe("fetch-questions-happy", () => {
  // UUID used to link up all the items
  let sessionId = uuidv4();

  // ttl for all items in test
  const ttl = Math.floor((Date.now() + 7200 * 1000) / 1000);

  const stateMachineInput = {
    sessionId: sessionId,
  };

  const sessionItem = {
    sessionId: sessionId,
    attemptCount: 0,
    clientId: "ipv-core-stub-aws-prod",
    clientIpAddress: "192.0.2.1",
    clientSessionId: uuidv4(),
    createdDate: Date.now(),
    expiryDate: ttl,
    persistentSessionId: uuidv4(),
    redirectUri: "http://localhost:8085/callback",
    state: uuidv4(),
  };

  // Both the same until happy path test user has questions
  const happyPathSocialSecurityRecord = {
    socialSecurityRecord: [{ personalNumber: "KE000000C" }],
  };

  const unhappyPathSocialSecurityRecord = {
    socialSecurityRecord: [{ personalNumber: "NA000000Q" }],
  };

  const personIdentity = {
    sessionId: sessionId,
    expiryDate: ttl,
    socialSecurityRecord: happyPathSocialSecurityRecord.socialSecurityRecord,
  };

  let stackOutputValues: Partial<{
    FetchQuestionsStateMachineArn: string;
    CommonAPISessionTableName: string;
    CommonAPIPersonIdentityTableName: string;
    QuestionsTableName: string;
  }>;

  beforeEach(async () => {
    stackOutputValues = await stackOutputs(process.env.STACK_NAME);

    // Unique Session ID for each test
    sessionId = uuidv4();
    stateMachineInput.sessionId = sessionId;
    sessionItem.sessionId = sessionId;
    personIdentity.sessionId = sessionId;
  });

  afterEach(async () => {
    // reset test data to default
    personIdentity.socialSecurityRecord =
      happyPathSocialSecurityRecord.socialSecurityRecord;
  });

  describe("Happy Path Journey", () => {
    // Test will need updated when test user has questions
    it("should request questions for NINO, and save questions when HMRC has questions and return SufficientQuestions", async () => {
      await populateTable(
        sessionItem,
        stackOutputValues.CommonAPISessionTableName
      );
      await populateTable(
        personIdentity,
        stackOutputValues.CommonAPIPersonIdentityTableName
      );

      const startExecutionResult = (await executeStepFunction(
        stateMachineInput,
        stackOutputValues.FetchQuestionsStateMachineArn
      )) as any;

      expect(startExecutionResult.status).toEqual("SUCCEEDED");

      const result = JSON.parse(startExecutionResult.output);
      expect(result.StatusCode).toEqual(200);

      // Will be SufficientQuestions when test user has questions
      expect(result.Payload.fetchQuestionsState).toEqual("SufficientQuestions");

      const questionItemResult = (
        await getTableItem(stackOutputValues.QuestionsTableName as string, {
          sessionId: sessionId,
        })
      ).Item;

      // Will be the count of questions after question filtering
      expect(questionItemResult?.questions?.length).toEqual(3);

      const questions = questionItemResult?.questions;

      // Check orders are unique
      const uniqueOrders = new Set<number>();
      questions.forEach(
        (question: { [s: string]: number } | ArrayLike<number>) => {
          for (const [key, value] of Object.entries(question)) {
            if (key == "order") {
              uniqueOrders.add(value);
            }
          }
        }
      );

      // Are the unique orders are the expected length
      expect(uniqueOrders.size).toEqual(questions.length);

      // Check unique orders are sequential
      const sorterOrders = Array.from(uniqueOrders).sort((a, b) => a - b);
      for (let i = 0; i < sorterOrders.length; i++) {
        // orders are base 0
        expect(sorterOrders[i]).toEqual(i);
      }
    });

    it("should request questions for NINO, and save no questions when HMRC has no questions then return InsufficientQuestions", async () => {
      await populateTable(
        sessionItem,
        stackOutputValues.CommonAPISessionTableName
      );

      personIdentity.socialSecurityRecord =
        unhappyPathSocialSecurityRecord.socialSecurityRecord;
      await populateTable(
        personIdentity,
        stackOutputValues.CommonAPIPersonIdentityTableName
      );

      const startExecutionResult = (await executeStepFunction(
        stateMachineInput,
        stackOutputValues.FetchQuestionsStateMachineArn
      )) as any;

      expect(startExecutionResult.status).toEqual("SUCCEEDED");

      const result = JSON.parse(startExecutionResult.output);
      expect(result.StatusCode).toEqual(200);

      // Will be SufficientQuestions when test user has questions
      expect(result.Payload.fetchQuestionsState).toEqual(
        "InsufficientQuestions"
      );

      const questionItemResult = (
        await getTableItem(stackOutputValues.QuestionsTableName as string, {
          sessionId: sessionId,
        })
      ).Item;

      expect(questionItemResult?.questions?.length).toEqual(0);
    });

    it.each([
      ["NoQuestionsInSavedResultItem"],
      ["SufficientQuestionsInSavedResultItem"],
    ])(
      "should not request questions for NINO if there is already as saved reult, instead the FetchQuestionsState maching the previously saved result should be retured",
      async (scenario: string) => {
        await populateTable(
          sessionItem,
          stackOutputValues.CommonAPISessionTableName
        );
        await populateTable(
          personIdentity,
          stackOutputValues.CommonAPIPersonIdentityTableName
        );

        const alreadySaveInsufficientQuestionsQuestionResultItem = {
          sessionId: sessionId,
          expiryDate: ttl,
          correlationId: uuidv4(),
          questions: [],
        } as any;

        const alreadySavedSufficientQuestionsQuestionResultItem = {
          sessionId: sessionId,
          expiryDate: ttl,
          correlationId: uuidv4(),
          questions: [
            {
              questionKey: "rti-p60-payment-for-year",
              info: {
                currentTaxYear: "2023/24",
                previousTaxYear: "2022/23",
              },
              order: 1,
            },
            {
              questionKey: "rti-p60-employee-ni-contributions",
              info: {
                currentTaxYear: "2023/24",
                previousTaxYear: "2022/23",
              },
              order: 2,
            },
            {
              questionKey: "tc-amount",
              order: 3,
            },
          ],
        } as any;

        await populateTable(
          scenario == "NoQuestionsInSavedResultItem"
            ? alreadySaveInsufficientQuestionsQuestionResultItem
            : alreadySavedSufficientQuestionsQuestionResultItem,
          stackOutputValues.QuestionsTableName
        );

        const startExecutionResult = (await executeStepFunction(
          stateMachineInput,
          stackOutputValues.FetchQuestionsStateMachineArn
        )) as any;

        expect(startExecutionResult.status).toEqual("SUCCEEDED");

        const result = JSON.parse(startExecutionResult.output);
        expect(result.StatusCode).toEqual(200);

        // Will be SufficientQuestions when test user has questions
        expect(result.Payload.fetchQuestionsState).toEqual(
          scenario == "NoQuestionsInSavedResultItem"
            ? "InsufficientQuestions"
            : "ContinueSufficientQuestionAlreadyRetrieved"
        );

        const questionItemResult = (
          await getTableItem(stackOutputValues.QuestionsTableName as string, {
            sessionId: sessionId,
          })
        ).Item;

        expect(questionItemResult).toEqual(
          scenario == "NoQuestionsInSavedResultItem"
            ? alreadySaveInsufficientQuestionsQuestionResultItem
            : alreadySavedSufficientQuestionsQuestionResultItem
        );
        expect(questionItemResult?.questions?.length).toEqual(
          scenario == "NoQuestionsInSavedResultItem" ? 0 : 3
        );
      }
    );
  });
});
