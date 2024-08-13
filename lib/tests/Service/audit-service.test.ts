import { AuditService } from "../../src/Service/audit-service";
import { mock } from "jest-mock-extended";
import { AuditEventType, HmrcIvqResponse } from "../../src/types/audit-event";
import { SqsAuditClient } from "../../src/Service/sqs-audit-client";
import { Evidence } from "../../../lambdas/issue-credential/src/utils/evidence-builder";

const mockInputEvent = {
  vcIssuer: "testIssuer",
  sessionItem: {
    Item: {
      expiryDate: {
        N: "1234",
      },
      clientIpAddress: {
        S: "51.149.8.131",
      },
      subject: {
        S: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
      },
      persistentSessionId: {
        S: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
      },
      sessionId: {
        S: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
      },
      clientSessionId: {
        S: "b8c1fb22-7fd2-4935-ab8b-a70d6cf18949",
      },
    },
  },
};

const issuer = "https://issuer.gov.uk";

describe(AuditService, () => {
  process.env.RESULTS_TABLE_NAME = "RESULTS_TABLE_NAME";
  let service: AuditService;

  const mockSqsAuditClient = mock<SqsAuditClient>();

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuditService(mockSqsAuditClient);
  });

  it("should send IPV_HMRC_KBV_CRI_START audit event", async () => {
    await service.sendAuditEvent(
      AuditEventType.START,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      undefined,
      issuer,
      undefined
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_START",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });

  it("should send IPV_HMRC_KBV_CRI_THIN_FILE_ENCOUNTERED audit event", async () => {
    const hmrcIvqResponse: HmrcIvqResponse = {
      outcome: "Insufficient Questions",
    };
    await service.sendAuditEvent(
      AuditEventType.THIN_FILE_ENCOUNTERED,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      hmrcIvqResponse,
      issuer,
      undefined
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_THIN_FILE_ENCOUNTERED",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        extensions: expect.objectContaining({
          hmrcIvqResponse: expect.objectContaining({
            outcome: "Insufficient Questions",
          }),
        }),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });

  it("should send IPV_HMRC_KBV_CRI_REQUEST_SENT audit event", async () => {
    await service.sendAuditEvent(
      AuditEventType.REQUEST_SENT,
      mockInputEvent.sessionItem,
      "123456789",
      "GetQuestions",
      undefined,
      issuer,
      undefined
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_REQUEST_SENT",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        extensions: expect.objectContaining({
          endpoint: "GetQuestions",
        }),
        restricted: expect.objectContaining({
          socialSecurityRecord: expect.arrayContaining([
            { personalNumber: "123456789" },
          ]),
        }),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });

  it("should send IPV_HMRC_KBV_CRI_RESPONSE_RECEIVED audit event", async () => {
    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect: 1,
      totalQuestionsAsked: 2,
      totalQuestionsAnsweredIncorrect: 2,
      outcome: "Not Authenticated",
    };

    await service.sendAuditEvent(
      AuditEventType.RESPONSE_RECEIVED,
      mockInputEvent.sessionItem,
      "123456789",
      "SubmitAnswers",
      hmrcIvqResponse,
      issuer,
      undefined
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_RESPONSE_RECEIVED",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        extensions: expect.objectContaining({
          hmrcIvqResponse: hmrcIvqResponse,
          endpoint: "SubmitAnswers",
        }),
        restricted: expect.objectContaining({
          socialSecurityRecord: expect.arrayContaining([
            { personalNumber: "123456789" },
          ]),
        }),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });

  it("should send IPV_HMRC_KBV_CRI_VC_ISSUED audit event", async () => {
    const hmrcIvqResponse: HmrcIvqResponse = {
      totalQuestionsAnsweredCorrect: 1,
      totalQuestionsAsked: 2,
      totalQuestionsAnsweredIncorrect: 2,
      outcome: "Not Authenticated",
    };

    const evidence: Evidence[] = [
      {
        checkDetails: [
          {
            kbvResponseMode: "free_text",
            checkMethod: "kbv",
            kbvQuality: 2,
          },
          {
            kbvResponseMode: "free_text",
            checkMethod: "kbv",
            kbvQuality: 2,
          },
          {
            kbvResponseMode: "free_text",
            checkMethod: "kbv",
            kbvQuality: 2,
          },
        ],
        verificationScore: 2,
        txn: "8KJTLGN7QX",
        type: "IdentityCheck",
      },
    ];

    await service.sendAuditEvent(
      AuditEventType.VC_ISSUED,
      mockInputEvent.sessionItem,
      "123456789",
      "SubmitAnswers",
      hmrcIvqResponse,
      issuer,
      evidence
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_VC_ISSUED",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        extensions: expect.objectContaining({
          evidence: evidence,
          hmrcIvqResponse: hmrcIvqResponse,
          iss: issuer,
        }),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });

  it("should send IPV_HMRC_KBV_CRI_END audit event", async () => {
    await service.sendAuditEvent(
      AuditEventType.END,
      mockInputEvent.sessionItem,
      undefined,
      undefined,
      undefined,
      issuer,
      undefined
    );

    expect(mockSqsAuditClient.send).toHaveBeenCalledTimes(1);
    expect(mockSqsAuditClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: issuer,
        event_name: "IPV_HMRC_KBV_CRI_END",
        event_timestamp_ms: expect.any(Number),
        timestamp: expect.any(Number),
        user: expect.objectContaining({
          user_id: expect.stringContaining("urn:fdc:gov.uk:2022"),
          ip_address: expect.any(String),
          session_id: expect.any(String),
          persistent_session_id: expect.any(String),
          govuk_signin_journey_id: expect.any(String),
        }),
      })
    );
  });
});
