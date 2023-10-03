import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { QuestionInfo, Response } from "./question-info-event";
import {
  checkDetails,
  checkDetailsType,
  failedCheckDetails,
} from "./check-details";

const logger = new Logger();

export class CheckDetailsHandler implements LambdaInterface {
  public async handler(
    event: Response<QuestionInfo>,
    _context: unknown
  ): Promise<Array<checkDetailsType>> {
    const questionItems: Array<QuestionInfo> =
      (event?.questionResponseEvent?.Items as Array<QuestionInfo>) || [];
    try {
      const isCorrect = (info: QuestionInfo) => info?.score?.S === "correct";

      return questionItems?.map((questionInfo) =>
        isCorrect(questionInfo) ? checkDetails : failedCheckDetails
      ) as Array<checkDetailsType>;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error in EventCheckDetailHandler: ${message}`);
      throw error;
    }
  }
}

const handlerClass = new CheckDetailsHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
