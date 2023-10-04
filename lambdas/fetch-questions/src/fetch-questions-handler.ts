import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger();

export class FetchQuestionsHandler implements LambdaInterface {

  public async handler(event: any, _context: unknown): Promise<string> {
    try {
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
      let json;
      try {
        json = await response.json();
      } catch (error: any) {
        return await response.text();
      }
      if(json.questions.length <= 0) {
        throw new Error("No questions returned");
      }
      return json;
    } catch (error: any) {
      logger.error("Error in MatchingHandler: " + error.message);
      throw error;
    }
  }
}

const handlerClass = new FetchQuestionsHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
