/*
import { CriAuditConfig } from "../types/cri-audit-config";

export class AuditConfig {
  queueUrl: string | undefined;
  auditEventNamePrefix: string | undefined;
  issuer: string | undefined;

  public getAuditConfig(): CriAuditConfig {
    this.auditEventNamePrefix = process.env.SQS_AUDIT_EVENT_PREFIX;
    if (!auditEventNamePrefix) {
      throw new Error("Missing environment variable: SQS_AUDIT_EVENT_PREFIX");
    }
    this.queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
    if (!queueUrl) {
      throw new Error(
        "Missing environment variable: SQS_AUDIT_EVENT_QUEUE_URL"
      );
    }
    this.issuer = "verifiable-credential/issuer";
    return {
      this.auditEventNamePrefix,
      this.issuer,
      this.queueUrl,
    };
  }
}
*/
