import { DynamoDBDocument, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const ServiceName: string = "resultsRetrievalService";
const logger = new Logger({ serviceName: `${ServiceName}` });

export class ResultsRetrievalService {
  private dynamo: DynamoDBDocument;

  constructor(dynamoDbClient: DynamoDBDocument) {
    this.dynamo = dynamoDbClient;
  }

  public async getResults(sessionId: string): Promise<any> {
    logger.info("Getting Result item from DB with ID " + sessionId);
    const command = new GetCommand({
      TableName: process.env.RESULTS_TABLE_NAME,
      Key: {
        sessionId: sessionId,
      },
    });
    return await this.dynamo.send(command);
  }
}
