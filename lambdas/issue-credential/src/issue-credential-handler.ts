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

import { IssueCredentialInputs } from "./types/issue-credential-types";

import { Evidence, EvidenceBuilder } from "./utils/evidence-builder";
import {
  CredentialSubject,
  CredentialSubjectBuilder,
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
import { SqsAuditClient } from "../../../lib/src/Service/sqs-audit-client";
import {
  SessionItem,
  PersonIdentityItem,
} from "../../../lib/src/types/common-types";

const logger = new Logger({ serviceName: "IssueCredentialHandler" });
const credentialSubjectBuilder = new CredentialSubjectBuilder();
const evidenceBuilder = new EvidenceBuilder();
const checkDetailsBuilder = new CheckDetailsBuilder();

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
    try {
      logger.info("handler start");

      // Safely retrieve lambda inputs
      const inputs: IssueCredentialInputs =
        this.safeRetrieveLambdaEventInputs(event);

      const answerResults = await this.resultsRetrievalService.getResults(
        inputs.sessionItem.sessionId
      );

      const correlationId = answerResults.Item.correlationId;

      const sub = "urn:uuid:" + uuidv4().toString();
      const nbf = Date.now();
      const iss = inputs.verifiableCredentialssuer;
      const jti = "urn:uuid:" + uuidv4().toString();

      const checkDetailsCount: number =
        answerResults.Item.checkDetailsCount ?? 0;
      const failedCheckDetailsCount: number =
        answerResults.Item?.failedCheckDetailsCount ?? 0;

      const totalQuestionsAsked = checkDetailsCount + failedCheckDetailsCount;

      let outcome = "Not Authenticated";

      if (answerResults.Item.verificationScore > 0) {
        outcome = "Authenticated";
      }

      const credentialSubject: CredentialSubject = credentialSubjectBuilder
        .setSocialSecurityRecord(inputs.personIdentityItem.socialSecurityRecord)
        .addNames(inputs.personIdentityItem.names)
        .setBirthDate(inputs.personIdentityItem.birthDates)
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
        inputs.sessionItem,
        undefined,
        undefined,
        hmrcIvqResponse,
        iss,
        evidence
      );

      logger.info("Sending CRI_END Audit Event");
      await this.auditService.sendAuditEvent(
        AuditEventType.END,
        inputs.sessionItem,
        undefined,
        undefined,
        undefined,
        iss
      );

      return { vcBody: verifiableCredential };
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

  private safeRetrieveLambdaEventInputs(event: any): IssueCredentialInputs {
    const parameters = event?.parameters;
    const maxJwtTtl = event?.parameters?.maxJwtTtl?.value;
    const jwtTtlUnit = event?.parameters?.jwtTtlUnit?.value;
    const verifiableCredentialssuer =
      event?.parameters?.verifiableCredentialssuer?.value;
    const kmsSigningKeyId = event?.parameters?.kmsSigningKeyId?.value;

    const bearerToken = event?.bearerToken; // NOTE expiry is not checked as its not used currently

    const personIdentityItem = event?.personIdentityItem;
    const sessionItem = event?.sessionItem;

    if (!event) {
      throw new Error("input event is empty");
    }

    if (!bearerToken) {
      throw new Error("bearerToken was not provided");
    }

    if (!parameters) {
      throw new Error("event parameters not found");
    }

    if (!maxJwtTtl) {
      throw new Error("maxJwtTtl was not provided");
    }

    if (!jwtTtlUnit) {
      throw new Error("jwtTtlUnit was not provided");
    }

    if (!verifiableCredentialssuer) {
      throw new Error("verifiableCredentialssuer was not provided");
    }

    if (!kmsSigningKeyId) {
      throw new Error("kmsSigningKeyId was not provided");
    }

    if (!personIdentityItem) {
      throw new Error("personIdentityItem not found");
    }

    if (!sessionItem) {
      throw new Error("Session item was not provided");
    } else {
      try {
        this.validateUnmarshalledSessionItem(sessionItem);
      } catch (error: any) {
        const errorText: string = error.message;

        throw new Error(`Session item was malformed : ${errorText}`);
      }
    }

    return {
      bearerToken: bearerToken,
      sessionItem: sessionItem as SessionItem,
      personIdentityItem: personIdentityItem as PersonIdentityItem,
      maxJwtTtl: maxJwtTtl,
      jwtTtlUnit: jwtTtlUnit,
      verifiableCredentialssuer: verifiableCredentialssuer,
      kmsSigningKeyId: kmsSigningKeyId,
    } as IssueCredentialInputs;
  }

  private validateUnmarshalledSessionItem(sessionItem: any) {
    if (Object.keys(sessionItem).length === 0) {
      throw new Error("Session item is empty");
    }

    if (!sessionItem.sessionId) {
      throw new Error("Session item missing sessionId");
    }

    if (!sessionItem.expiryDate) {
      throw new Error("Session item missing expiryDate");
    }

    if (!sessionItem.clientIpAddress) {
      throw new Error("Session item missing clientIpAddress");
    }

    if (!sessionItem.redirectUri) {
      throw new Error("Session item missing redirectUri");
    }

    if (!sessionItem.clientSessionId) {
      throw new Error("Session item missing clientSessionId");
    }

    if (!sessionItem.createdDate) {
      throw new Error("Session item missing createdDate");
    }

    if (!sessionItem.clientId) {
      throw new Error("Session item missing clientId");
    }

    if (!sessionItem.persistentSessionId) {
      throw new Error("Session item missing persistentSessionId");
    }

    if (!sessionItem.attemptCount && sessionItem.attemptCount != 0) {
      throw new Error("Session item missing attemptCount");
    }

    if (!sessionItem.state) {
      throw new Error("Session item missing state");
    }

    if (!sessionItem.subject) {
      throw new Error("Session item missing subject");
    }
  }
}
// Handler Export
const metricProbe = new MetricsProbe();
const queueUrl = process.env.SQS_AUDIT_EVENT_QUEUE_URL;
const criAuditConfig: CriAuditConfig = {
  queueUrl,
};
const handlerClass = new IssueCredentialHandler(
  metricProbe,
  new ResultsRetrievalService(createDynamoDbClient()),
  new AuditService(
    new SqsAuditClient(
      () => criAuditConfig,
      new SQSClient({
        region: "eu-west-2",
        credentials: fromEnv(),
      })
    )
  ),
  queueUrl
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
