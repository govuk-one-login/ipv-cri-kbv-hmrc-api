import { LambdaInterface } from "@aws-lambda-powertools/commons";

import { Logger } from "@aws-lambda-powertools/logger";
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
  resultsRetrievalService: ResultsRetrievalService;

  constructor(resultsRetrievalService: ResultsRetrievalService) {
    this.resultsRetrievalService = resultsRetrievalService;
  }

  public async handler(event: any, _context: unknown): Promise<object> {
    logger.info("Issue Credential Handler called successfully");

    logger.info(JSON.stringify(event));

    const sessionId = event.userInfoEvent.Items[0].sessionId.S;
    let answerResults;

    try {
      answerResults = await this.resultsRetrievalService.getResults(sessionId);
    } catch (error: any) {
      //future test debt, check these errors aren't logging PII
      const errorText: string = error.message;
      throw new Error(`Error saving questions to dynamoDb ${errorText}`);
    }
    const correlationId = answerResults.Item.correlationId;

    const sub = "urn:uuid:" + uuidv4().toString();
    const nbf = Date.now();
    const iss = event.vcIssuer;
    const jti = "urn:uuid:" + uuidv4().toString();

    const credentialSubject: CredentialSubject = credentialSubjectBuilder
      .setSocialSecurityRecord(this.extractSocialSecurityRecordFromEvent(event))
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

    return verifiableCredential;
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
const handlerClass = new IssueCredentialHandler(
  new ResultsRetrievalService(createDynamoDbClient())
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
