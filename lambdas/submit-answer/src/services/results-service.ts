import {
  SubmitAnswerResult,
  AnswerResultItem,
} from "../types/answer-result-types";
import {
  DynamoDBDocument,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { LogHelper } from "../../../../lib/src/Logging/log-helper";
import { SessionItem } from "../../../../lib/src/types/common-types";
import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";

const ServiceName: string = "ResultsService";
const logHelper = new LogHelper(ServiceName);

const MINIMUM_QUESTION_COUNT = 0;
const MAXIMUM_QUESTION_COUNT_FOR_NO_CI = 2;

export class ResultsService {
  private readonly dynamo: DynamoDBDocument;

  constructor(dynamoDbClient: DynamoDBDocument) {
    this.dynamo = dynamoDbClient;
  }

  public async saveResults(
    sessionId: string,
    correlationId: string,
    expiryDate: number,
    answerResults: SubmitAnswerResult[],
    verificationScore: number,
    checkDetailsCount: number,
    failedCheckDetailsCount: number
  ): Promise<boolean> {
    logHelper.info("Saving kbv results...");
    let ciValue: string;
    try {
      logHelper.info("Getting SSM parameters");

      const ciParameterPath = process.env.CI_VALUE_PARAM_NAME as string;
      const ciParameter = await this.getContraIndicator(ciParameterPath);

      ciValue = ciParameter;
    } catch (error: any) {
      logHelper.info(`Error getting SSM parameters: ${error.message}`);
      ciValue = "";
    }

    const answerResultItem: AnswerResultItem = new AnswerResultItem(
      sessionId,
      correlationId,
      expiryDate,
      answerResults,
      verificationScore,
      checkDetailsCount > MINIMUM_QUESTION_COUNT
        ? checkDetailsCount
        : undefined,
      failedCheckDetailsCount > MINIMUM_QUESTION_COUNT
        ? failedCheckDetailsCount
        : undefined,
      checkDetailsCount >= MAXIMUM_QUESTION_COUNT_FOR_NO_CI
        ? undefined
        : [ciValue]
    );
    logHelper.info("Mapped to answers to result item");
    try {
      logHelper.info("Commencing DB put...");
      const putAnswersCommand = new PutCommand({
        TableName: process.env.RESULTS_TABLE_NAME,
        Item: answerResultItem,
      });
      await this.dynamo.send(putAnswersCommand);
      logHelper.info("Answer Results saved successfully to DB");
      return true;
    } catch (error: any) {
      //future test debt, check these errors aren't logging PII
      const errorText: string = error.message;
      throw new Error(`Error saving questions to dynamoDb ${errorText}`);
    }
  }

  public async getResults(sessionId: Record<string, unknown>): Promise<any> {
    logHelper.info("Getting item from DB with ID " + sessionId);
    const command = new GetCommand({
      TableName: process.env.RESULTS_TABLE_NAME,
      Key: {
        sessionId: sessionId,
      },
    });
    return await this.dynamo.send(command);
  }

  public async attachLogging(
    sessionItem: SessionItem,
    statemachine: Statemachine
  ) {
    logHelper.setSessionItemToLogging(sessionItem);
    logHelper.setStatemachineValuesToLogging(statemachine);
  }

  private async getContraIndicator(ssmParamName: string): Promise<string> {
    const parameter = await getParameter(ssmParamName);

    logHelper.info("Successfully retrieved paramater from SSM");

    return parameter as string;
  }
}
