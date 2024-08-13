import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { AuditEvent } from "../types/audit-event";
import { CriAuditConfig } from "../types/cri-audit-config";

export class SqsAuditClient {
  constructor(
    private readonly getAuditConfig: () => CriAuditConfig,
    private readonly sqsClient: SQSClient
  ) {}

  public async send(auditEvent: AuditEvent) {
    const auditConfig = this.getAuditConfig();
    const sendMsgCommand = new SendMessageCommand({
      MessageBody: JSON.stringify(auditEvent),
      QueueUrl: auditConfig?.queueUrl as string,
    });
    await this.sqsClient.send(sendMsgCommand);
  }
}
