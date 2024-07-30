import { Logger } from "@aws-lambda-powertools/logger";
import { SubmitAnswerResult } from "../types/answer-result-types";

const logger = new Logger({ serviceName: "CheckDetailsCountCalculator" });

export class CheckDetailsCountCalculator {
  public calculateAnswerCount(
    answerResults: SubmitAnswerResult[],
    answerStatusType: string
  ): number {
    logger.info(`Calculating ${answerStatusType} answers count`);

    const answerStatusList: Array<string> = [];

    answerResults.forEach((answer: any) => {
      if (answer.status === answerStatusType) {
        answerStatusList.push(answer.status);
      }
    });

    const answerCount = answerStatusList.length;

    logger.info(`${answerStatusType} answer count =  ${answerCount}`);

    return answerCount;
  }
}
