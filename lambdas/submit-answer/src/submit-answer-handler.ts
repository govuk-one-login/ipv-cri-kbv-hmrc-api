import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger();

export class SubmitAnswerHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<string> {
    try {
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
      try {
        return await response.json();
      } catch (error: any) {
        return await response.text();
      }
    } catch (error: any) {
      logger.error("Failed to call HMRC API: " + error.message);
      throw error;
    }
  }
}

const handlerClass = new SubmitAnswerHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
