import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import AWSXRay from "aws-xray-sdk-core";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

export const createDynamoDbClient = () => {
  const marshallOptions = {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  const client = new DynamoDBClient({
    region: "eu-west-2",
    credentials: fromEnv(),
  });

  const ddbDocClient = DynamoDBDocument.from(client, translateConfig);
  return process.env.XRAY_ENABLED === "true"
    ? AWSXRay.captureAWSv3Client(ddbDocClient as any)
    : ddbDocClient;
};
