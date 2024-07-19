import { Logger } from "@aws-lambda-powertools/logger";
import { SubmitAnswerResult } from "../types/answer-result-types";

const logger = new Logger({ serviceName: "VerificationScoreCalculator" });

export class VerificationScoreCalculator {
  public calculateVerificationScore(
    answerResults: SubmitAnswerResult[]
  ): number {
    logger.info("Calculating verification score");

    const answerStatusList: Array<string> = [];

    answerResults.forEach((answer: any) => {
      if (answer.status === "correct") {
        answerStatusList.push(answer.status);
      }
    });

    const correctAnswerCount = answerStatusList.length;

    logger.info("Correct answer count =  " + correctAnswerCount);

    if (correctAnswerCount >= 2) {
      return 2;
    } else {
      return 0;
    }
  }
}
