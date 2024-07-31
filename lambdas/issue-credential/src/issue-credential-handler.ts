import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { SQSClient } from "@aws-sdk/client-sqs";
import { fromEnv } from "@aws-sdk/credential-providers";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { Evidence, NamePart, EvidenceBuilder } from "./utils/evidence-builder";
import {
  BirthDate,
  CredentialSubject,
  CredentialSubjectBuilder,
  SocialSecurityRecord,
} from "./utils/credential-subject-builder";
import { Vc, VerifiableCredential } from "./types/vc-types";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";

import { v4 as uuidv4 } from "uuid";
import { ResultsRetrievalService } from "./services/results-retrieval-service";
import { CheckDetailsBuilder } from "./utils/check-details-builder";

import { CriAuditConfig } from "../../../lib/src/types/cri-audit-config";
import { AuditService } from "../../../lib/src/Service/audit-service";
import {
  AuditEventType,
  HmrcIvqResponse,
} from "../../../lib/src/types/audit-event";

const logger = new Logger({ serviceName: "IssueCredentialHandler" });
const credentialSubjectBuilder = new CredentialSubjectBuilder();
const evidenceBuilder = new EvidenceBuilder();
const checkDetailsBuilder = new CheckDetailsBuilder();

const sqsClient = new SQSClient({
  region: "eu-west-2",
  credentials: fromEnv(),
});

export class IssueCredentialHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;
  resultsRetrievalService: ResultsRetrievalService;
  auditService: AuditService;
  sqsQueueUrl: string | undefined;

  constructor(
    metricsProbe: MetricsProbe,
    resultsRetrievalService: ResultsRetrievalService,
    auditService: AuditService,
    sqsQueueUrl: string | undefined
  ) {
    this.metricsProbe = metricsProbe;
    this.resultsRetrievalService = resultsRetrievalService;
    this.auditService = auditService;
    this.sqsQueueUrl = sqsQueueUrl;
  }

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    logger.info("Issue Credential Handler called successfully");

    const sessionItem = event.sessionItem;

    const sessionId = event.userInfoEvent.Items[0].sessionId.S;
    let answerResults;

    logger.info(JSON.stringify(event));

    try {
      answerResults = await this.resultsRetrievalService.getResults(sessionId);

      const correlationId = answerResults.Item.correlationId;

      const sub = "urn:uuid:" + uuidv4().toString();
      const nbf = Date.now();
      const iss = event.vcIssuer;
      const jti = "urn:uuid:" + uuidv4().toString();

      const checkDetailsCount = answerResults.Item.checkDetailsCount;
      const failedCheckDetailsCount =
        answerResults.Item.failedCheckDetailsCount;
      const totalQuestionsAsked = checkDetailsCount + failedCheckDetailsCount;
      const outcome = "Not Authenticated";

      const credentialSubject: CredentialSubject = credentialSubjectBuilder
        .setSocialSecurityRecord(
          this.extractSocialSecurityRecordFromEvent(event)
        )
        .addNames(this.extractNamePartFromEvent(event))
        .setBirthDate(this.extractBirthDateFromEvent(event))
        .build();

      const evidence: Array<Evidence> = evidenceBuilder
        .addCheckDetails(
          checkDetailsBuilder.buildCheckDetails(checkDetailsCount)
        )
        .addFailedCheckDetails(
          checkDetailsBuilder.buildCheckDetails(failedCheckDetailsCount)
        )
        .addVerificationScore(answerResults.Item.verificationScore)
        .addCi(answerResults.Item.ci)
        .addTxn(correlationId)
        .build();

      const type: Array<string> = [
        "VerifiableCredential",
        "IdentityCheckCredential",
      ];

      const vc = new Vc(evidence, credentialSubject, type);
      const verifiableCredential = new VerifiableCredential(
        sub,
        nbf,
        iss,
        vc,
        jti
      );

      logger.info("Verifiable Credential Successfully Created");

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      const hmrcIvqResponse: HmrcIvqResponse = {
        totalQuestionsAnsweredCorrect: checkDetailsCount,
        totalQuestionsAsked: totalQuestionsAsked,
        totalQuestionsAnsweredIncorrect: failedCheckDetailsCount,
        outcome: outcome,
      };

      logger.info("Sending VC_ISSUED Audit Event");
      await this.auditService.sendAuditEvent(
        AuditEventType.VC_ISSUED,
        sessionItem,
        undefined,
        undefined,
        hmrcIvqResponse,
        iss,
        evidence
      );

      logger.info("Sending CRI_END Audit Event");
      await this.auditService.sendAuditEvent(AuditEventType.END, sessionItem);

      logger.info(JSON.stringify(verifiableCredential));

      return verifiableCredential;
    } catch (error: any) {
      const lambdaName = IssueCredentialHandler.name;
      const errorText: string = error.message;

      const errorMessage = `${lambdaName} : ${errorText}`;
      logger.error(errorMessage);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      // Indicate to the statemachine a lambda error has occured
      return { error: errorMessage };
    }
  }

  private extractNamePartFromEvent = (event: any): Array<NamePart> => {
    return event.userInfoEvent.Items[0].names.L[0].M.nameParts.L.map(
      (part: any) =>
        ({ type: part.M.type.S, value: part.M.value.S }) as NamePart
    );
  };

  private extractSocialSecurityRecordFromEvent = (
    event: any
  ): Array<SocialSecurityRecord> => {
    return event.userInfoEvent.Items[0].socialSecurityRecord.L.map(
      (part: any) => ({ personalNumber: part.M.personalNumber.S })
    );
  };

  private extractBirthDateFromEvent = (event: any): Array<BirthDate> => {
    return event.userInfoEvent.Items[0].birthDates.L.map((part: any) => ({
      value: part.M.value.S,
    }));
  };
}
// Handler Export
const metricProbe = new MetricsProbe();
const queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
const issuer = "verifiable-credential/issuer";
const criAuditConfig: CriAuditConfig = {
  queueUrl,
  issuer,
};
const handlerClass = new IssueCredentialHandler(
  metricProbe,
  new ResultsRetrievalService(createDynamoDbClient()),
  new AuditService(() => criAuditConfig, sqsClient),
  queueUrl
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
