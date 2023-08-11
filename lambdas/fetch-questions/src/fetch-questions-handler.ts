import { LambdaInterface } from "@aws-lambda-powertools/commons";

export class FetchQuestionsHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<string> {
    const response = await fetch(event.parameters.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": event.parameters.userAgent,
        Authorization: "Bearer " + event.bearerToken.value,
      },
      body: JSON.stringify({
        nino: event.nino,
      }),
    });
    return await response.json();
  }
}

const handlerClass = new FetchQuestionsHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
