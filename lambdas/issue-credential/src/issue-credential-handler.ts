import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";

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

const logger = new Logger({ serviceName: "IssueCredentialHandler" });
const credentialSubjectBuilder = new CredentialSubjectBuilder();
const evidenceBuilder = new EvidenceBuilder();

export class IssueCredentialHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;
  resultsRetrievalService: ResultsRetrievalService;

  constructor(
    metricsProbe: MetricsProbe,
    resultsRetrievalService: ResultsRetrievalService
  ) {
    this.metricsProbe = metricsProbe;
    this.resultsRetrievalService = resultsRetrievalService;
  }

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    logger.info("Issue Credential Handler called successfully");

    const sessionId = event.userInfoEvent.Items[0].sessionId.S;
    let answerResults;

    try {
      answerResults = await this.resultsRetrievalService.getResults(sessionId);

      const correlationId = answerResults.Item.correlationId;

      const sub = "urn:uuid:" + uuidv4().toString();
      const nbf = Date.now();
      const iss = event.vcIssuer;
      const jti = "urn:uuid:" + uuidv4().toString();

      const credentialSubject: CredentialSubject = credentialSubjectBuilder
        .setSocialSecurityRecord(
          this.extractSocialSecurityRecordFromEvent(event)
        )
        .addNames(this.extractNamePartFromEvent(event))
        .setBirthDate(this.extractBirthDateFromEvent(event))
        .build();

      const evidence: Array<Evidence> = evidenceBuilder
        .addVerificationScore(answerResults.Item.verificationScore)
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

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

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
const handlerClass = new IssueCredentialHandler(
  metricProbe,
  new ResultsRetrievalService(createDynamoDbClient())
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
