import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { IssueCredentialHandler } from "../src/issue-credential-handler";
import { ResultsRetrievalService } from "../src/services/results-retrieval-service";
import { Evidence, EvidenceBuilder } from "../src/utils/evidence-builder";
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
import { AuditService } from "../../../lib/src/Service/audit-service";
import { PersonIdentityAddress } from "../../../lib/src/types/common-types";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../lib/src/types/audit-event";
import {
  PersonIdentityItem,
  SessionItem,
} from "../../../lib/src/types/common-types";

jest.mock("../src/../../../lib/src/Service/metrics-probe");
jest.mock("../src/../../../lib/src/Service/audit-service");

const mockSessionItem: SessionItem = {
  expiryDate: 1234,
  clientIpAddress: "127.0.0.1",
  redirectUri: "http://localhost:8085/callback",
  clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
  createdDate: 1722954983024,
  clientId: "unit-test-clientid",
  subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
  persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
  attemptCount: 0,
  sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
  state: "7f42f0cc-1681-4455-872f-dd228103a12e",
};

const mockPersonIdentityItem: PersonIdentityItem = {
  sessionId: "testSessionId",
  socialSecurityRecord: [
    {
      personalNumber: "123456789",
    },
  ],
  names: [
    {
      nameParts: [
        { type: "GivenName", value: "Rishi" },
        { type: "FamilyName", value: "Johnson" },
      ],
    },
  ],
  birthDates: [
    {
      value: "2000-11-05",
    },
  ],
  expiryDate: 1234,
};

const mockInputEvent = {
  bearerToken: "TEST_TOKEN",
  parameters: {
    maxJwtTtl: { value: 600 },
    jwtTtlUnit: { value: "HOURS" },
    issuer: { value: "TEST_ISSUER" },
    verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
  },
  sessionItem: mockSessionItem,
  personIdentityItem: mockPersonIdentityItem,
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
  let mockAuditService: jest.MockedObjectDeep<typeof AuditService>;

  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";
  process.env.SQS_AUDIT_EVENT_QUEUE_URL = "SQS_AUDIT_EVENT_QUEUE_URL";

  let dynamoDbDocument: DynamoDBDocument;

  let mockMetricsProbeSpy: jest.SpyInstance;
  let mockAuditServiceSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);
    mockAuditService = jest.mocked(AuditService);

    mockMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureMetric"
    );

    mockAuditServiceSpy = jest.spyOn(
      mockAuditService.prototype,
      "sendAuditEvent"
    );

    evidenceBuilder = new EvidenceBuilder();
    credentialSubjectBuilder = new CredentialSubjectBuilder();
    checkDetailsBuilder = new CheckDetailsBuilder();
  });

  it("SuccessWithVerifificationScore2", async () => {
    dynamoDbDocument = {
      send: jest.fn().mockReturnValue(Promise.resolve(testAnswerResultHappy)),
    } as unknown as DynamoDBDocument;

    const SQS_AUDIT_EVENT_QUEUE_URL: string = "SQS_AUDIT_EVENT_QUEUE_URL";

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService,
      mockAuditService.prototype,
      SQS_AUDIT_EVENT_QUEUE_URL
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.parameters.issuer.value;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.personIdentityItem.socialSecurityRecord
      )
      .addNames(mockInputEvent.personIdentityItem.names)
      .setBirthDate(mockInputEvent.personIdentityItem.birthDates)
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
    const expectedResponse = {
      vcBody: new VerifiableCredential(sub, nbf, iss, vc, jti),
    };

    const lambdaResponse = (await issueCredentialHandler.handler(
      mockInputEvent,
      mockInputContext
    )) as { vcBody: VerifiableCredential };

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.vcBody.sub = sub;
    lambdaResponse.vcBody.nbf = nbf;
    lambdaResponse.vcBody.jti = jti;

    expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.OK
    );

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect:
        testAnswerResultHappy.Item.checkDetailsCount,
      totalQuestionsAsked:
        testAnswerResultHappy.Item.checkDetailsCount +
        testAnswerResultHappy.Item.failedCheckDetailsCount,
      totalQuestionsAnsweredIncorrect:
        testAnswerResultHappy.Item.failedCheckDetailsCount,
      outcome: "Authenticated",
    };

    expect(mockAuditServiceSpy).toHaveBeenNthCalledWith(
      1,
      AuditEventType.VC_ISSUED,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      hmrcIvqResponse,
      iss,
      evidence
    );

    expect(mockAuditServiceSpy).toHaveBeenNthCalledWith(
      2,
      AuditEventType.END,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      undefined,
      iss
    );

    expect(mockAuditServiceSpy).toHaveBeenCalledTimes(2);
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

    const SQS_AUDIT_EVENT_QUEUE_URL: string = "SQS_AUDIT_EVENT_QUEUE_URL";

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService,
      mockAuditService.prototype,
      SQS_AUDIT_EVENT_QUEUE_URL
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.parameters.issuer.value;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.personIdentityItem.socialSecurityRecord
      )
      .addNames(mockInputEvent.personIdentityItem.names)
      .setBirthDate(mockInputEvent.personIdentityItem.birthDates)
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
    const expectedResponse = {
      vcBody: new VerifiableCredential(sub, nbf, iss, vc, jti),
    };

    const lambdaResponse = (await issueCredentialHandler.handler(
      mockInputEvent,
      mockInputContext
    )) as { vcBody: VerifiableCredential };

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.vcBody.sub = sub;
    lambdaResponse.vcBody.nbf = nbf;
    lambdaResponse.vcBody.jti = jti;

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect:
        testAnswerResultHappyFailedCheckDetails.Item.checkDetailsCount,
      totalQuestionsAsked:
        testAnswerResultHappyFailedCheckDetails.Item.checkDetailsCount +
        testAnswerResultHappyFailedCheckDetails.Item.failedCheckDetailsCount,
      totalQuestionsAnsweredIncorrect:
        testAnswerResultHappyFailedCheckDetails.Item.failedCheckDetailsCount,
      outcome: "Not Authenticated",
    };

    expect(mockAuditServiceSpy).toHaveBeenCalledWith(
      AuditEventType.VC_ISSUED,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      hmrcIvqResponse,
      iss,
      evidence
    );

    expect(mockAuditServiceSpy).toHaveBeenCalledWith(
      AuditEventType.END,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      undefined,
      iss
    );

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

    const SQS_AUDIT_EVENT_QUEUE_URL: string = "SQS_AUDIT_EVENT_QUEUE_URL";

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      mockMetricsProbe.prototype,
      resultsRetrievalService,
      mockAuditService.prototype,
      SQS_AUDIT_EVENT_QUEUE_URL
    );

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = mockInputEvent.parameters.issuer.value;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(
        mockInputEvent.personIdentityItem.socialSecurityRecord
      )
      .addNames(mockInputEvent.personIdentityItem.names)
      .setBirthDate(mockInputEvent.personIdentityItem.birthDates)
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
    const expectedResponse = {
      vcBody: new VerifiableCredential(sub, nbf, iss, vc, jti),
    };

    const lambdaResponse = (await issueCredentialHandler.handler(
      mockInputEvent,
      mockInputContext
    )) as { vcBody: VerifiableCredential };

    //The below is a temporary workAround for random UUID generation causing test to fail as jti/sub/nbf fields mismatch in VC
    lambdaResponse.vcBody.sub = sub;
    lambdaResponse.vcBody.nbf = nbf;
    lambdaResponse.vcBody.jti = jti;

    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect:
        testAnswerResultHappy1FailedCheckDetails.Item.checkDetailsCount,
      totalQuestionsAsked:
        testAnswerResultHappy1FailedCheckDetails.Item.checkDetailsCount +
        testAnswerResultHappy1FailedCheckDetails.Item.failedCheckDetailsCount,
      totalQuestionsAnsweredIncorrect:
        testAnswerResultHappy1FailedCheckDetails.Item.failedCheckDetailsCount,
      outcome: "Authenticated",
    };

    expect(mockAuditServiceSpy).toHaveBeenCalledWith(
      AuditEventType.VC_ISSUED,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      hmrcIvqResponse,
      iss,
      evidence
    );

    expect(mockAuditServiceSpy).toHaveBeenCalledWith(
      AuditEventType.END,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      undefined,
      iss
    );

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  describe("Failure Scenarios", () => {
    // The following tests test the lambda being called missing requried inputs
    // and checks the assoicated error is thrown
    it.each([
      [undefined, "input event is empty"],
      [
        {
          bearerToken: undefined,
        },
        "bearerToken was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: undefined,
        },
        "event parameters not found",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: undefined,
          },
          sessionItem: mockSessionItem,
          personIdentityItem: mockPersonIdentityItem,
        },
        "maxJwtTtl was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: undefined,
          },
          sessionItem: mockSessionItem,
          personIdentityItem: mockPersonIdentityItem,
        },
        "jwtTtlUnit was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: undefined,
          },
          sessionItem: mockSessionItem,
          personIdentityItem: mockPersonIdentityItem,
        },
        "issuer was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: undefined,
          },
          sessionItem: mockSessionItem,
          personIdentityItem: mockPersonIdentityItem,
        },
        "issuer was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: undefined,
          },
          sessionItem: mockSessionItem,
          personIdentityItem: mockPersonIdentityItem,
        },
        "verifiableCredentialKmsSigningKeyId was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: undefined,
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: mockSessionItem,
          personIdentityItem: undefined,
        },
        "personIdentityItem not found",
      ],
    ])(
      "should return an error event is missing required values 'testInputEvent: %s, expectedError: %s'",
      async (testInputEvent: any, expectedError: string) => {
        const lambdaResponse = await issueCredentialHandler.handler(
          testInputEvent,
          mockInputContext
        );

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnit.Count,
          CompletionStatus.ERROR
        );

        const lambdaName = IssueCredentialHandler.name;
        const errorMessage = `${lambdaName} : ${expectedError}`;
        const expectedResponse = { error: errorMessage };

        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );

    // The following tests test the lambda being called missing requried inputs
    // and checks the assoicated error is thrown
    it.each([
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was not provided",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          personIdentityItem: mockPersonIdentityItem,
          sessionItem: {},
        },
        "Session item was malformed : Session item is empty",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing sessionId",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing expiryDate",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing clientIpAddress",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing redirectUri",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing clientSessionId",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing createdDate",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing clientId",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing subject",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
            state: "7f42f0cc-1681-4455-872f-dd228103a12e",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing attemptCount",
      ],
      [
        {
          bearerToken: "TEST_TOKEN",
          parameters: {
            maxJwtTtl: { value: 600 },
            jwtTtlUnit: { value: "HOURS" },
            issuer: { value: "TEST_ISSUER" },
            verifiableCredentialKmsSigningKeyId: { value: "TEST_KID" },
          },
          sessionItem: {
            expiryDate: "1234",
            clientIpAddress: "127.0.0.1",
            redirectUri: "http://localhost:8085/callback",
            clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
            createdDate: "1722954983024",
            clientId: "unit-test-clientid",
            subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
            persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
            attemptCount: "0",
            sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
          },
          personIdentityItem: mockPersonIdentityItem,
        },
        "Session item was malformed : Session item missing state",
      ],
    ])(
      "should return an error sessionItem is missing required values 'testInputEvent: %s, expectedError: %s'",
      async (testInputEvent: any, expectedError: string) => {
        const lambdaResponse = await issueCredentialHandler.handler(
          testInputEvent,
          mockInputContext
        );

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnit.Count,
          CompletionStatus.ERROR
        );

        const lambdaName = IssueCredentialHandler.name;
        const errorMessage = `${lambdaName} : ${expectedError}`;
        const expectedResponse = { error: errorMessage };

        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );
  });
});
