import { Evidence } from "../../../lambdas/issue-credential/src/utils/evidence-builder";
import { PersonIdentitySocialSecurityRecord } from "./common-types";

export enum AuditEventType {
  START = "IPV_HMRC_KBV_CRI_START", // Before a session is written to the Session table
  REQUEST_SENT = "IPV_HMRC_KBV_CRI_REQUEST_SENT", // When a third party call is started
  RESPONSE_RECEIVED = "IPV_HMRC_KBV_CRI_RESPONSE_RECEIVED", // When a third party response has been recieved
  THIN_FILE_ENCOUNTERED = "IPV_HMRC_KBV_CRI_THIN_FILE_ENCOUNTERED", // When a third party response contains thin file
  VC_ISSUED = "IPV_HMRC_KBV_CRI_VC_ISSUED", // When the final VC is created in the issue credential lambda
  END = "IPV_HMRC_KBV_CRI_END", // When VC credentials are being returned - final event
}

export interface AuditEventUser {
  user_id?: string;
  ip_address?: string;
  session_id?: string;
  persistent_session_id?: string;
  govuk_signin_journey_id?: string;
}

export interface AuditEvent {
  component_id: string;
  event_name: string;
  event_timestamp_ms: number;
  timestamp: number;
  user: AuditEventUser;
  restricted: AuditEventRestricted | undefined;
  extensions: AuditEventExtensions | undefined;
}

export interface AuditEventExtensions {
  endpoint?: string;
  hmrcIvqResponse?: HmrcIvqResponse;
  iss?: string;
  evidence?: Array<Evidence>;
}

export interface AuditEventRestricted {
  socialSecurityRecord: PersonIdentitySocialSecurityRecord[];
}

export interface HmrcIvqResponse {
  totalQuestionsReturned?: number;
  totalQuestionsAnsweredCorrect?: number;
  totalQuestionsAsked?: number;
  totalQuestionsAnsweredIncorrect?: number;
  outcome?: string;
}
