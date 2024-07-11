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

  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";

  let dynamoDbDocument: DynamoDBDocument;

  beforeEach(() => {
    jest.clearAllMocks();

    dynamoDbDocument = {
      send: jest.fn().mockReturnValue(Promise.resolve(testAnswerResultHappy)),
    } as unknown as DynamoDBDocument;

    resultsRetrievalService = new ResultsRetrievalService(dynamoDbDocument);
    issueCredentialHandler = new IssueCredentialHandler(
      resultsRetrievalService
    );
    evidenceBuilder = new EvidenceBuilder();
    credentialSubjectBuilder = new CredentialSubjectBuilder();
  });

  it("SuccessWithVerifificationScore2", async () => {
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
      .addVerificationScore(testAnswerResultHappy.Item.verificationScore)
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

    expect(lambdaResponse).toEqual(expectedResponse);
  });
});
