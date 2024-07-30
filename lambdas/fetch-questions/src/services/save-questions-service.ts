import { Logger } from "@aws-lambda-powertools/logger";
import {
  Info,
  Question,
  QuestionResultItem,
  QuestionResultItemInfo,
  QuestionResultItemQuestion,
} from "../types/questions-result-types";
import {
  DynamoDBDocument,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const ServiceName: string = "SaveQuestionsService";
const logger = new Logger({ serviceName: `${ServiceName}` });

export class SaveQuestionsService {
  private dynamo: DynamoDBDocument;

  constructor(dynamoDbClient: DynamoDBDocument) {
    this.dynamo = dynamoDbClient;
  }

  public async saveQuestions(
    sessionId: string,
    expiryDate: number,
    correlationId: string,
    questions: Question[]
  ): Promise<boolean> {
    logger.info("Start of saveQuestions method");
    const questionsResultItem: QuestionResultItem = new QuestionResultItem(
      sessionId,
      correlationId,
      expiryDate,
      this.mapQuestions(questions)
    );
    logger.info("Question result mapped to questions result item");
    try {
      const putQuestionsCommand = new PutCommand({
        TableName: process.env.QUESTIONS_TABLE_NAME,
        Item: questionsResultItem,
      });
      await this.dynamo.send(putQuestionsCommand);
      logger.info("Questions saved successfully to dynamoDb");
      return true;
    } catch (error: any) {
      //future test debt, check these errors aren't logging PII
      const errorText: string = error.message;
      throw new Error(`Error saving questions to dynamoDb ${errorText}`);
    }
  }

  private mapQuestions(questions: Question[]): QuestionResultItemQuestion[] {
    logger.info("mappingQuesiton");
    const questionItems: QuestionResultItemQuestion[] = [];

    let index = 0;
    for (const question of questions) {
      const questionResultItemQuestion: QuestionResultItemQuestion =
        new QuestionResultItemQuestion(
          question.questionKey,
          this.mapInfo(question.info),
          false,
          index
        );
      questionItems.push(questionResultItemQuestion);
      index++;
    }

    return questionItems;
  }

  private mapInfo(info: Info | undefined): QuestionResultItemInfo {
    logger.info("mappingInfo");

    const questionResultItemInfo: QuestionResultItemInfo =
      new QuestionResultItemInfo(info?.taxYearCurrent, info?.taxYearPrevious);
    return questionResultItemInfo;
  }

  //record string changed to be just string
  public async getExistingSavedItem(sessionId: string): Promise<any> {
    const command = new GetCommand({
      TableName: process.env.QUESTIONS_TABLE_NAME,
      Key: {
        sessionId: sessionId,
      },
    });
    return await this.dynamo.send(command);
  }
}
