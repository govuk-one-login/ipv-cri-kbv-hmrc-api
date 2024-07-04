import { LambdaInterface } from "@aws-lambda-powertools/commons";

import { Logger } from "@aws-lambda-powertools/logger";
const logger = new Logger({ serviceName: "IssueCredentialHandler" });

export class IssueCredentialHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<object> {
    const verifiableCredential = { "Issue Credential": "Successful" };
    logger.info("Issue Credential Handler called successfully");
    return verifiableCredential;
  }
}
// Handler Export
const handlerClass = new IssueCredentialHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
