import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { Logger } from "@aws-lambda-powertools/logger";

const client = new DynamoDBClient({
  region: process.env["AWS_REGION"],
  credentials: fromEnv(),
});

const docClient = DynamoDBDocumentClient.from(client);

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
      const json = await response.json();
      for (const item of json) {
        await docClient.send(
          new UpdateCommand({
            TableName: event.questionTableName,
            Key: {
              sessionId: event.sessionId,
              questionKey: item.questionKey,
            },
            UpdateExpression: "SET score = :score",
            ExpressionAttributeValues: {
              ":score": item.score,
            },
          })
        );
      }
      return json;
    } catch (error: any) {
      logger.error("SubmitAnswerHandler Error: " + error.message);
      throw error;
    }
  }
}

const handlerClass = new SubmitAnswerHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
