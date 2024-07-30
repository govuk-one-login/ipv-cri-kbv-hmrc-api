import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { IssueCredentialHandler } from "../src/issue-credential-handler";
import { ResultsRetrievalService } from "../src/services/results-retrieval-service";
import {
  Evidence,
  NamePart,
  EvidenceBuilder,
} from "../src/utils/evidence-builder";
import {
  CredentialSubject,
  CredentialSubjectBuilder,
} from "../src/utils/credential-subject-builder";
import { Vc, VerifiableCredential } from "../src/types/vc-types";
import { v4 as uuidv4 } from "uuid";
import { CheckDetailsBuilder } from "../src/utils/check-details-builder";

import { MetricsProbe } from "../src/../../../lib/src/Service/metrics-probe";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
jest.mock("../src/../../../lib/src/Service/metrics-probe");

const mockInputEvent = {
  vcIssuer: "testIssuer",
  userInfoEvent: {
    Items: [
      {
        sessionId: { S: "testSessionId" },
        socialSecurityRecord: {
          L: [
            {
              M: {
                personalNumber: { S: "123456789" },
              },
            },
          ],
        },
        names: {
          L: [
            {
              M: {
                nameParts: {
                  L: [
                    { M: { type: { S: "GivenName" }, value: { S: "Rishi" } } },
                    {
                      M: { type: { S: "FamilyName" }, value: { S: "Johnson" } },
                    },
                  ],
                },
              },
            },
          ],
        },
        birthDates: {
          L: [{ M: { value: { S: "2000-11-05" } } }],
        },
      },
    ],
  },
};

const testAnswerResultHappy = {
  Item: {
    correlationId: "correlationId",
    ttl: 1234567890,
    answers: [
      {
        questionKey: "rti-p60-payment-for-year",
        status: "correct",
      },
      {
        questionKey: "rti-payslip-income-tax",
        status: "correct",
      },
      {
        questionKey: "sa-income-from-pensions",
        status: "correct",
      },
    ],
    verificationScore: 2,
    ci: ["CI1"],
    checkDetailsCount: 3,
    failedCheckDetailsCount: 0,
  },
};

const testAnswerResultHappyFailedCheckDetails = {
  Item: {
    correlationId: "correlationId",
    ttl: 1234567890,
    answers: [
      {
        questionKey: "rti-p60-payment-for-year",
        status: "incorrect",
      },
      {
        questionKey: "rti-payslip-income-tax",
        status: "incorrect",
      },
      {
        questionKey: "sa-income-from-pensions",
        status: "incorrect",
      },
    ],
    verificationScore: 0,
    ci: ["CI1"],
    failedCheckDetailsCount: 3,
    checkDetailsCount: 0,
  },
};

const testAnswerResultHappy1FailedCheckDetails = {
  Item: {
    correlationId: "correlationId",
    ttl: 1234567890,
    answers: [
      {
        questionKey: "rti-p60-payment-for-year",
        status: "incorrect",
      },
      {
        questionKey: "rti-payslip-income-tax",
        status: "correct",
      },
      {
        questionKey: "sa-income-from-pensions",
        status: "correct",
      },
    ],
    verificationScore: 2,
    ci: ["CI1"],
    failedCheckDetailsCount: 1,
    checkDetailsCount: 2,
  },
};

const mockInputContext = {
  invokedFunctionArn: "test",
};

describe("IssueCredentialHandler", () => {
  let issueCredentialHandler: IssueCredentialHandler;
  let resultsRetrievalService: ResultsRetrievalService;
  let credentialSubjectBuilder: CredentialSubjectBuilder;
  let evidenceBuilder: EvidenceBuilder;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;
  let checkDetailsBuilder: CheckDetailsBuilder;

  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";

  let dynamoDbDocument: DynamoDBDocument;

  let mockMetricsProbeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureMetric"
    );

    evidenceBuilder = new EvidenceBuilder();
    credentialSubjectBuilder = new CredentialSubjectBuilder();
    checkDetailsBuilder = new CheckDetailsBuilder();
  });

  it("SuccessWithVerifificationScore2", async () => {
    dynamoDbDocument = {
      send: jest.fn().mockReturnValue(Promise.resolve(testAnswerResultHappy)),
    } as unknown as DynamoDBDocument;

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.vcIssuer;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.userInfoEvent.Items[0].socialSecurityRecord.L.map(
          (part: any) => ({ personalNumber: part.M.personalNumber.S })
        )
      )
      .addNames(
        mockInputEvent.userInfoEvent.Items[0].names.L[0].M.nameParts.L.map(
          (part: any) =>
            ({ type: part.M.type.S, value: part.M.value.S }) as NamePart
        )
      )
      .setBirthDate(
        mockInputEvent.userInfoEvent.Items[0].birthDates.L.map((part: any) => ({
          value: part.M.value.S,
        }))
      )
      .build();

    const evidence: Array<Evidence> = evidenceBuilder
      .addCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappy.Item.checkDetailsCount
        )
      )
      .addFailedCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappy.Item.failedCheckDetailsCount
        )
      )
      .addVerificationScore(testAnswerResultHappy.Item.verificationScore)
      .addCi(["CI1"])
      .addTxn(testAnswerResultHappy.Item.correlationId)
      .build();

    const type: Array<string> = [
      "VerifiableCredential",
      "IdentityCheckCredential",
    ];

    const vc = new Vc(evidence, credentialSubject, type);
    const expectedResponse = new VerifiableCredential(sub, nbf, iss, vc, jti);

    const lambdaResponse: VerifiableCredential =
      (await issueCredentialHandler.handler(
        mockInputEvent,
        mockInputContext
      )) as VerifiableCredential;

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.sub = sub;
    lambdaResponse.nbf = nbf;
    lambdaResponse.jti = jti;

    expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.OK
    );

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  it("SuccessWithVerifificationScore0", async () => {
    dynamoDbDocument = {
      send: jest
        .fn()
        .mockReturnValue(
          Promise.resolve(testAnswerResultHappyFailedCheckDetails)
        ),
    } as unknown as DynamoDBDocument;

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.vcIssuer;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.userInfoEvent.Items[0].socialSecurityRecord.L.map(
          (part: any) => ({ personalNumber: part.M.personalNumber.S })
        )
      )
      .addNames(
        mockInputEvent.userInfoEvent.Items[0].names.L[0].M.nameParts.L.map(
          (part: any) =>
            ({ type: part.M.type.S, value: part.M.value.S }) as NamePart
        )
      )
      .setBirthDate(
        mockInputEvent.userInfoEvent.Items[0].birthDates.L.map((part: any) => ({
          value: part.M.value.S,
        }))
      )
      .build();

    const evidence: Array<Evidence> = evidenceBuilder
      .addCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappyFailedCheckDetails.Item.checkDetailsCount
        )
      )
      .addFailedCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappyFailedCheckDetails.Item.failedCheckDetailsCount
        )
      )
      .addVerificationScore(
        testAnswerResultHappyFailedCheckDetails.Item.verificationScore
      )
      .addCi(["CI1"])
      .addTxn(testAnswerResultHappyFailedCheckDetails.Item.correlationId)
      .build();

    const type: Array<string> = [
      "VerifiableCredential",
      "IdentityCheckCredential",
    ];

    const vc = new Vc(evidence, credentialSubject, type);
    const expectedResponse = new VerifiableCredential(sub, nbf, iss, vc, jti);

    const lambdaResponse: VerifiableCredential =
      (await issueCredentialHandler.handler(
        mockInputEvent,
        mockInputContext
      )) as VerifiableCredential;

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.sub = sub;
    lambdaResponse.nbf = nbf;
    lambdaResponse.jti = jti;

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  it("SuccessWith1FailedCheckAnd2CheckDetails", async () => {
    dynamoDbDocument = {
      send: jest
        .fn()
        .mockReturnValue(
          Promise.resolve(testAnswerResultHappy1FailedCheckDetails)
        ),
    } as unknown as DynamoDBDocument;

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.vcIssuer;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.userInfoEvent.Items[0].socialSecurityRecord.L.map(
          (part: any) => ({ personalNumber: part.M.personalNumber.S })
        )
      )
      .addNames(
        mockInputEvent.userInfoEvent.Items[0].names.L[0].M.nameParts.L.map(
          (part: any) =>
            ({ type: part.M.type.S, value: part.M.value.S }) as NamePart
        )
      )
      .setBirthDate(
        mockInputEvent.userInfoEvent.Items[0].birthDates.L.map((part: any) => ({
          value: part.M.value.S,
        }))
      )
      .build();

    const evidence: Array<Evidence> = evidenceBuilder
      .addCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappy1FailedCheckDetails.Item.checkDetailsCount
        )
      )
      .addFailedCheckDetails(
        checkDetailsBuilder.buildCheckDetails(
          testAnswerResultHappy1FailedCheckDetails.Item.failedCheckDetailsCount
        )
      )
      .addVerificationScore(
        testAnswerResultHappy1FailedCheckDetails.Item.verificationScore
      )
      .addCi(["CI1"])
      .addTxn(testAnswerResultHappy1FailedCheckDetails.Item.correlationId)
      .build();

    const type: Array<string> = [
      "VerifiableCredential",
      "IdentityCheckCredential",
    ];

    const vc = new Vc(evidence, credentialSubject, type);
    const expectedResponse = new VerifiableCredential(sub, nbf, iss, vc, jti);

    const lambdaResponse: VerifiableCredential =
      (await issueCredentialHandler.handler(
        mockInputEvent,
        mockInputContext
      )) as VerifiableCredential;

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.sub = sub;
    lambdaResponse.nbf = nbf;
    lambdaResponse.jti = jti;

    expect(lambdaResponse).toEqual(expectedResponse);
  });
});
