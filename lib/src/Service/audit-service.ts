import {
  AuditEvent,
  AuditEventRestricted,
  AuditEventType,
  AuditEventUser,
  AuditEventExtensions,
  HmrcIvqResponse,
} from "../types/audit-event";
import { SqsAuditClient } from "./sqs-audit-client";

import { Evidence } from "../../../lambdas/issue-credential/src/utils/evidence-builder";
import {
  SessionItem,
  PersonIdentitySocialSecurityRecord,
} from "../types/common-types";

export class AuditService {
  constructor(private readonly sqsAuditClient: SqsAuditClient) {}

  public async sendAuditEvent(
    eventType: AuditEventType,
    sessionItem: SessionItem,
    nino?: string | undefined,
    endpoint?: string | undefined,
    hmrcIvqResponse?: HmrcIvqResponse | undefined,
    iss?: string | undefined,
    evidence?: Array<Evidence> | undefined
  ) {
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
    sessionItem: SessionItem,
    nino?: string | undefined,
    endpoint?: string | undefined,
    hmrcIvqResponse?: HmrcIvqResponse | undefined,
    iss?: string | undefined,
    evidence?: Array<Evidence> | undefined
  ): AuditEvent {
    const auditEventUser: AuditEventUser =
      this.createAuditEventUser(sessionItem);

    const timestamp_ms = Date.now();
    const timestamp = Math.floor(timestamp_ms / 1000);

    const auditEvent = {
      component_id: iss,
      event_name: eventType,
      event_timestamp_ms: timestamp_ms,
      timestamp: timestamp,
      user: auditEventUser,
    } as AuditEvent;

    if (nino !== undefined) {
      auditEvent.restricted = this.createRestricted(nino);
    }

    if (eventType === AuditEventType.VC_ISSUED) {
      auditEvent.extensions = this.createExtensions(
        hmrcIvqResponse,
        undefined,
        iss,
        evidence
      );
    }
    if (
      eventType === AuditEventType.REQUEST_SENT ||
      eventType === AuditEventType.RESPONSE_RECEIVED ||
      eventType === AuditEventType.THIN_FILE_ENCOUNTERED
    ) {
      auditEvent.extensions = this.createExtensions(hmrcIvqResponse, endpoint);
    }

    return auditEvent;
  }

  private createExtensions(
    hmrcIvqResponse?: HmrcIvqResponse,
    endpoint?: string,
    iss?: string,
    evidence?: Array<Evidence>
  ): AuditEventExtensions {
    const extensions: AuditEventExtensions = {};
    if (hmrcIvqResponse !== undefined) {
      extensions.hmrcIvqResponse = hmrcIvqResponse;
    }
    if (endpoint !== undefined) {
      extensions.endpoint = endpoint;
    }
    if (iss !== undefined) {
      extensions.iss = iss;
    }
    if (evidence !== undefined) {
      extensions.evidence = evidence;
    }
    return extensions;
  }

  private createRestricted(nino: string): AuditEventRestricted {
    const socialSecurityRecord: PersonIdentitySocialSecurityRecord[] = [
      { personalNumber: nino },
    ];
    const restricted: AuditEventRestricted = {
      socialSecurityRecord: socialSecurityRecord,
    };
    return restricted;
  }

  private createAuditEventUser(
    sessionItem: SessionItem | undefined
  ): AuditEventUser {
    return {
      user_id: sessionItem?.subject ?? undefined,
      ip_address: sessionItem?.clientIpAddress ?? undefined,
      session_id: sessionItem?.sessionId ?? undefined,
      persistent_session_id: sessionItem?.persistentSessionId ?? undefined,
      govuk_signin_journey_id: sessionItem?.clientSessionId ?? undefined,
    };
  }

  private async sendAuditEventToQueue(auditEvent: AuditEvent) {
    await this.sqsAuditClient.send(auditEvent);
  }
}
