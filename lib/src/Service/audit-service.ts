import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  AuditEvent,
  AuditEventRestricted,
  AuditEventType,
  AuditEventUser,
  AuditEventExtensions,
  HmrcIvqResponse,
  SocialSecurityRecord,
} from "../types/audit-event";
import { CriAuditConfig } from "../types/cri-audit-config";
import { Evidence } from "../../../lambdas/issue-credential/src/utils/evidence-builder";

const COMPONENT_ID = "https://review-hk.build.account.gov.uk";

export class AuditService {
  private auditConfig: CriAuditConfig | undefined;
  constructor(
    private readonly getAuditConfig: () => CriAuditConfig,
    private readonly sqsClient: SQSClient
  ) {}

  public async sendAuditEvent(
    eventType: AuditEventType,
    sessionItem: any,
    nino?: string | undefined,
    endpoint?: string | undefined,
    hmrcIvqResponse?: HmrcIvqResponse | undefined,
    iss?: string | undefined,
    evidence?: Array<Evidence> | undefined
  ) {
    if (!this.auditConfig) {
      this.auditConfig = this.getAuditConfig();
    }
    const auditEvent = this.createAuditEvent(
      eventType,
      sessionItem,
      nino,
      endpoint,
      hmrcIvqResponse,
      iss,
      evidence
    );
    await this.sendAuditEventToQueue(auditEvent);
  }

  private createAuditEvent(
    eventType: AuditEventType,
    sessionItem: any,
    nino?: string | undefined,
    endpoint?: string | undefined,
    hmrcIvqResponse?: HmrcIvqResponse | undefined,
    iss?: string | undefined,
    evidence?: Array<Evidence> | undefined
  ): AuditEvent {
    const auditEventUser: AuditEventUser =
      this.createAuditEventUser(sessionItem);

    let restricted: AuditEventRestricted | undefined;
    if (nino !== undefined) {
      restricted = nino ? this.createRestricted(nino) : undefined;
    }

    const createVCExtension: boolean = iss && evidence ? true : false;

    let extensions: AuditEventExtensions | undefined;
    if (hmrcIvqResponse !== undefined) {
      extensions = createVCExtension
        ? this.createExtensions(hmrcIvqResponse, iss, evidence)
        : this.createExtensions(hmrcIvqResponse);
    }

    const timestamp = Date.now();
    return {
      timestamp: Math.floor(timestamp / 1000),
      event_timestamp_ms: timestamp,
      event_name: eventType,
      component_id: COMPONENT_ID,
      endpoint: endpoint ?? undefined,
      restricted: restricted ?? undefined,
      user: auditEventUser,
      extensions: extensions ?? undefined,
    } as AuditEvent;
  }

  private createExtensions(
    hmrcIvqResponse: HmrcIvqResponse,
    iss?: string,
    evidence?: Array<Evidence>
  ): AuditEventExtensions {
    return {
      hmrcIvqResponse: hmrcIvqResponse,
      iss: iss ?? undefined,
      evidence: evidence ?? undefined,
    };
  }

  private createRestricted(nino: string): AuditEventRestricted {
    const socialSecurityRecord: SocialSecurityRecord[] = [
      { personalNumber: nino },
    ];
    const restricted: AuditEventRestricted = {
      socialSecurityRecord: socialSecurityRecord,
    };
    return restricted;
  }

  private createAuditEventUser(sessionItem: any | undefined): AuditEventUser {
    return {
      user_id: sessionItem.Item.subject.S ?? undefined,
      ip_address: sessionItem.Item.clientIpAddress.S ?? undefined,
      session_id: sessionItem.Item.sessionId.S ?? undefined,
      persistent_session_id:
        sessionItem?.Item.persistentSessionId.S ?? undefined,
      govuk_signin_journey_id: sessionItem?.Item.clientSessionId.S ?? undefined,
    };
  }

  private async sendAuditEventToQueue(auditEvent: AuditEvent) {
    const sendMsgCommand = new SendMessageCommand({
      MessageBody: JSON.stringify(auditEvent),
      QueueUrl: this.auditConfig?.queueUrl as string,
    });
    await this.sqsClient.send(sendMsgCommand);
  }
}
