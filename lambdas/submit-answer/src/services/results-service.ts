import { Logger } from "@aws-lambda-powertools/logger";
import {
  SubmitAnswerResult,
  AnswerResultItem,
} from "../types/answer-result-types";
import {
  DynamoDBDocument,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const ServiceName: string = "ResultsService";
const logger = new Logger({ serviceName: `${ServiceName}` });

export class ResultsService {
  private dynamo: DynamoDBDocument;

  constructor(dynamoDbClient: DynamoDBDocument) {
    this.dynamo = dynamoDbClient;
  }

  public async saveResults(
    sessionId: string,
    correlationId: string,
    ttl: number,
    answerResults: SubmitAnswerResult[],
    verificationScore: number
  ): Promise<boolean> {
    logger.info("Saving kbv results...");

    const answerResultItem: AnswerResultItem = new AnswerResultItem(
      sessionId,
      correlationId,
      ttl,
      answerResults,
      verificationScore
    );
    logger.info("Mapped to answers to result item");
    try {
      logger.info("Commencing DB put...");
      const putAnswersCommand = new PutCommand({
        TableName: process.env.RESULTS_TABLE_NAME,
        Item: answerResultItem,
      });
      await this.dynamo.send(putAnswersCommand);
      logger.info("Answer Results saved successfully to DB");
      return true;
    } catch (error: any) {
      //future test debt, check these errors aren't logging PII
      const errorText: string = error.message;
      throw new Error(`Error saving questions to dynamoDb ${errorText}`);
    }
  }

  public async getResults(sessionId: Record<string, unknown>): Promise<any> {
    logger.info("Getting item from DB with ID " + sessionId);
    const command = new GetCommand({
      TableName: process.env.RESULTS_TABLE_NAME,
      Key: {
        sessionId: sessionId,
      },
    });
    return await this.dynamo.send(command);
  }
}
