import { LambdaInterface } from "@aws-lambda-powertools/commons";

export class CurrentTimeHandler implements LambdaInterface {
  public async handler(_event: unknown, _context: unknown): Promise<string> {
    return Math.floor(Date.now() / 1000).toString();
  }
}

const handlerClass = new CurrentTimeHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
