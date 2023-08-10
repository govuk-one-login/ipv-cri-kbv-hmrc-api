import { LambdaInterface } from "@aws-lambda-powertools/commons";

export class SubmitAnswerHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<string> {

    const response = await fetch(event.parameters.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": event.parameters.userAgent,
        Authorization: "Bearer " + event.oAuthToken.value,
      },
      body: JSON.stringify(
        {
          "correlationId": event.correlationId,
          "selection": {
            "nino": event.nino
          },
          "answers": [
            {
              "questionKey": event.questionKey,
              "answer": event.answer
            }
          ]
        }
      ),
    });
    return await response.json();
  }
}

const handlerClass = new SubmitAnswerHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
