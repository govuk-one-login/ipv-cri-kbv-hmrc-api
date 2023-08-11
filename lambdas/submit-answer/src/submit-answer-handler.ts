import { LambdaInterface } from "@aws-lambda-powertools/commons";

export class SubmitAnswerHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<string> {
    const answers = event.questions.Items.map((question: any) => {
      return {
        questionKey: question.questionKey.S,
        answer: question.answer.S,
      };
    });

    const response = await fetch(event.parameters.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": event.parameters.userAgent,
        Authorization: "Bearer " + event.oAuthToken.value,
      },
      body: JSON.stringify({
        correlationId: event.questions.Items[0].correlationId.S,
        selection: {
          nino: event.nino,
        },
        answers: answers,
      }),
    });
    return await response.json();
  }
}

const handlerClass = new SubmitAnswerHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
