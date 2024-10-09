import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
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
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import {
  SessionItem,
  PersonIdentityItem,
} from "../../../lib/src/types/common-types";
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";

const logHelper = new LogHelper("IssueCredentialHandler");

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

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      // Safely retrieve lambda input
      const input: IssueCredentialInputs =
        this.safeRetrieveLambdaEventinput(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const answerResults = await this.resultsRetrievalService.getResults(
        input.sessionItem.sessionId
      );

      const correlationId = answerResults.Item.correlationId;

      const sub = input.sessionItem.subject;
      const nbf = Date.now() / 1000;
      const iss = input.issuer;
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
        .setSocialSecurityRecord(input.personIdentityItem.socialSecurityRecord)
        .addNames(input.personIdentityItem.names)
        .setBirthDate(input.personIdentityItem.birthDates)
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

      logHelper.info("Verifiable Credential Successfully Created");

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

      logHelper.info("Sending VC_ISSUED Audit Event");
      await this.auditService.sendAuditEvent(
        AuditEventType.VC_ISSUED,
        input.sessionItem,
        undefined,
        undefined,
        hmrcIvqResponse,
        iss,
        evidence
      );

      logHelper.info("Sending CRI_END Audit Event");
      await this.auditService.sendAuditEvent(
        AuditEventType.END,
        input.sessionItem,
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
      logHelper.error(errorMessage);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      // Indicate to the statemachine a lambda error has occured
      return { error: errorMessage };
    }
  }

  private safeRetrieveLambdaEventinput(event: any): IssueCredentialInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    // Parameters
    const parameters = event?.parameters;
    const maxJwtTtl = event?.parameters?.maxJwtTtl?.value;
    const jwtTtlUnit = event?.parameters?.jwtTtlUnit?.value;
    const issuer = event?.parameters?.issuer?.value;
    const verifiableCredentialKmsSigningKeyId =
      event?.parameters?.verifiableCredentialKmsSigningKeyId?.value;
    if (!parameters) {
      throw new Error("event parameters not found");
    }

    if (!maxJwtTtl) {
      throw new Error("maxJwtTtl was not provided");
    }

    if (!jwtTtlUnit) {
      throw new Error("jwtTtlUnit was not provided");
    }

    if (!issuer) {
      throw new Error("issuer was not provided");
    }

    if (!verifiableCredentialKmsSigningKeyId) {
      throw new Error("verifiableCredentialKmsSigningKeyId was not provided");
    }

    // Oauth2 Access Token
    const bearerToken = event?.bearerToken;
    if (!bearerToken) {
      throw new Error("bearerToken was not provided");
    }

    // Session - Will throw errors on failure
    const sessionItem = event.sessionItem;
    SharedInputsValidator.validateUnmarshalledSessionItem(event.sessionItem);

    // State machine values for logging
    const statemachine = event.statemachine;
    if (!statemachine) {
      throw new Error("Statemachine values not found");
    }

    const personIdentityItem = event?.personIdentityItem;
    if (!personIdentityItem) {
      throw new Error("personIdentityItem not found");
    }

    const nino =
      event?.personIdentityItem?.socialSecurityRecord?.[0]?.personalNumber;
    if (!nino) {
      throw new Error("nino was not provided");
    }

    return {
      bearerToken: bearerToken,
      sessionItem: sessionItem as SessionItem,
      statemachine: statemachine as Statemachine,
      personIdentityItem: personIdentityItem as PersonIdentityItem,
      maxJwtTtl: maxJwtTtl,
      jwtTtlUnit: jwtTtlUnit,
      issuer: issuer,
      verifiableCredentialKmsSigningKeyId: verifiableCredentialKmsSigningKeyId,
    } as IssueCredentialInputs;
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
