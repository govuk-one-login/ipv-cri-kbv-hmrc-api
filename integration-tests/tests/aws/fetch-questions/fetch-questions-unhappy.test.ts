import { v4 as uuidv4 } from "uuid";
import { stackOutputs } from "../resources/cloudformation-helper";
import { populateTable } from "../resources/dynamodb-helper";
import { executeStepFunction } from "../resources/stepfunction-helper";
import {
  getSSMParamter,
  ssmParamterUpdate,
} from "../resources/ssm-param-helper";

describe("fetch-questions-unhappy", () => {
  // UUID used to link up all the items
  const sessionId = uuidv4();

  // ttl for all items in test
  const ttl = Math.floor((Date.now() + 7200 * 1000) / 1000);

  const sessionItem = {
    sessionId: sessionId,
    expiryDate: ttl,
    clientIpAddress: "127.0.0.1",
    redirectUri: "http://localhost:8085/callback",
    clientSessionId: uuidv4(),
    createdDate: Date.now(),
    clientId: "integration-test-clientid",
    subject: "integration-test-subject",
    persistentSessionId: uuidv4(),
    attemptCount: 0,
    state: uuidv4(),
  };

  const personIdentityMissingNino = {
    sessionId: sessionId,
    expiryDate: ttl,
    socialSecurityRecord: "personalNumberShouldBeHere",
  };

  const personIdentityWithBadNINOFormat = {
    sessionId: sessionId,
    expiryDate: ttl,
    socialSecurityRecord: [{ personalNumber: "ER000500Q" }],
  };

  let stackOutputValues: Partial<{
    FetchQuestionsStateMachineArn: string;
    CommonAPISessionTableName: string;
    CommonAPIPersonIdentityTableName: string;
    QuestionsTableName: string;
  }>;
  beforeEach(async () => {
    stackOutputValues = await stackOutputs(process.env.STACK_NAME);
  });

  it("should fail request if sessionId is missing with Err: SessionId missing", async () => {
    const startExecutionResult = (await executeStepFunction(
      {
        // No sessionId
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "SessionId missing or not found"
    );
  });

  it("should fail request if SessionItem is invalid with Err: SessionItem not valid", async () => {
    await populateTable(
      {
        sessionId: sessionId,
      },
      stackOutputValues.CommonAPISessionTableName
    );

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "SessionItem not valid"
    );
  });

  it("should fail request if cannot find PersonIdentityItem for the sessionId with Err: Fail SessionItem not found", async () => {
    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: uuidv4(),
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "SessionItem not found"
    );
  });

  it("should fail request if cannot find PersonIdentityItem for sessionId with Err: PersonIdentityItem not found", async () => {
    await populateTable(
      sessionItem,
      stackOutputValues.CommonAPISessionTableName
    );

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionItem.sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "PersonIdentityItem not found"
    );
  });

  it("should fail request if cannot find NINO in PersonIdentityItem for sessionId with Err: NINO not present in shared claims", async () => {
    await populateTable(
      sessionItem,
      stackOutputValues.CommonAPISessionTableName
    );

    await populateTable(
      personIdentityMissingNino,
      stackOutputValues.CommonAPIPersonIdentityTableName
    );

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionItem.sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "NINO was not present in shared claims"
    );
  });

  it("should fail request if OTG Lambda cannot use OTGURL and returns with Err: Lambda responded unexpectedly", async () => {
    await populateTable(
      sessionItem,
      stackOutputValues.CommonAPISessionTableName
    );

    await populateTable(
      personIdentityWithBadNINOFormat,
      stackOutputValues.CommonAPIPersonIdentityTableName
    );

    const otgApiUrlParam = `/${process.env.PARAMETER_PREFIX}/OtgApiUrl`;

    const currentURL = (await getSSMParamter({
      Name: otgApiUrlParam,
    })) as any;

    await ssmParamterUpdate({
      Name: otgApiUrlParam,
      Value: "bad-url",
      Type: "String",
      Overwrite: true,
    });

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionItem.sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    // Restore URL before the expect so a test failure wont leave stack in an unusable state
    await ssmParamterUpdate({
      Name: otgApiUrlParam,
      Value: currentURL.Parameter.Value,
      Type: "String",
      Overwrite: true,
    });

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "OTG Token Lambda responded unexpectedly"
    );
  });

  it("should fail request if FetchQuestions Lambda cannot use QuestionURL and returns with Err: Lambda responded unexpectedly", async () => {
    await populateTable(
      sessionItem,
      stackOutputValues.CommonAPISessionTableName
    );

    await populateTable(
      personIdentityWithBadNINOFormat,
      stackOutputValues.CommonAPIPersonIdentityTableName
    );

    const questionsUrlParameter = `/${process.env.PARAMETER_PREFIX}/QuestionsUrl`;

    const currentURL = (await getSSMParamter({
      Name: questionsUrlParameter,
    })) as any;

    await ssmParamterUpdate({
      Name: questionsUrlParameter,
      Value: "bad-url",
      Type: "String",
      Overwrite: true,
    });

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionItem.sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    // Restore URL before the expect so a test failure wont leave stack in an unusable state
    await ssmParamterUpdate({
      Name: questionsUrlParameter,
      Value: currentURL.Parameter.Value,
      Type: "String",
      Overwrite: true,
    });

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "FetchQuestions Lambda responded unexpectedly"
    );
  });

  it("should fail request if FetchQuestions Lambda gets an ERROR from 3rd Party API returns with Err: Lambda responded unexpectedly", async () => {
    await populateTable(
      sessionItem,
      stackOutputValues.CommonAPISessionTableName
    );

    await populateTable(
      personIdentityWithBadNINOFormat,
      stackOutputValues.CommonAPIPersonIdentityTableName
    );

    const startExecutionResult = (await executeStepFunction(
      {
        sessionId: sessionItem.sessionId,
      },
      stackOutputValues.FetchQuestionsStateMachineArn
    )) as any;

    expect(startExecutionResult.status).toEqual("FAILED");
    expect(new Map(Object.entries(startExecutionResult)).get("error")).toEqual(
      "FetchQuestions Lambda responded unexpectedly"
    );
  });
});
