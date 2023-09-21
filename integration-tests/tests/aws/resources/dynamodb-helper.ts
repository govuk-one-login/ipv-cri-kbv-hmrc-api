import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const populateTable = async (
  testUser: Record<string, unknown>,
  tableName?: string
) => {
  const command = new PutCommand({
    TableName: tableName,
    Item: testUser,
  });
  return await docClient.send(command);
};

export const clearItems = async (
  tableName: string,
  key: Record<string, unknown>
) => {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });
  return await docClient.send(command);
};
