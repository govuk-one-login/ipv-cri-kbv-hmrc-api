import { Logger } from "@aws-lambda-powertools/logger";
import { Question } from "../types/questions-result-types";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";

const ServiceName: string = "FilterQuestionService";
const logger = new Logger({ serviceName: `${ServiceName}` });

export class FilterQuestionsService {
  metricsProbe: MetricsProbe;

  constructor(metricProbe: MetricsProbe) {
    this.metricsProbe = metricProbe;
  }

  public async filterQuestions(questions: Question[]): Promise<Question[]> {
    //1. Low Confidence question key filtered out to leave medium confidence question keys
    const mediumConfidenceQuestions: Question[] = questions.filter(
      (question) => {
        if (question.questionKey === "ita-bankaccount") {
          return false;
        } else {
          return true;
        }
      }
    );

    //2. Creation of three lists of question keys for each category: Paye, Self Assessment & Tax Credit
    const payeCategory = mediumConfidenceQuestions.filter((question) => {
      if (
        question.questionKey === "rti-p60-payment-for-year" ||
        question.questionKey === "rti-p60-employee-ni-contributions" ||
        question.questionKey === "rti-p60-earnings-above-pt" ||
        question.questionKey === "rti-p60-statutory-maternity-pay" ||
        question.questionKey === "rti-p60-statutory-shared-parental-pay" ||
        question.questionKey === "rti-p60-statutory-adoption-pay" ||
        question.questionKey === "rti-p60-student-loan-deductions" ||
        question.questionKey === "rti-p60-postgraduate-loan-deductions" ||
        question.questionKey === "rti-payslip-income-tax" ||
        question.questionKey === "rti-payslip-national-insurance"
      ) {
        return true;
      } else {
        return false;
      }
    });

    const selfAssessmentCategory = mediumConfidenceQuestions.filter(
      (question) => {
        if (
          question.questionKey === "sa-income-from-pensions" ||
          question.questionKey === "sa-payment-details"
        ) {
          return true;
        } else {
          return false;
        }
      }
    );

    const taxCreditCategory = mediumConfidenceQuestions.filter((question) => {
      if (question.questionKey === "tc-amount") {
        return true;
      } else {
        return false;
      }
    });
    logger.info("The question keys have been sorted into categories");

    //3. Check to ensure at least two categories contain question keys
    const payeContainsQuestions: boolean = payeCategory.length > 0;
    const selfAssessmentContainsQuestions: boolean =
      selfAssessmentCategory.length > 0;
    const taxCreditContainsQuestions: boolean = taxCreditCategory.length > 0;

    const noOfCategories: boolean[] = [
      payeContainsQuestions,
      selfAssessmentContainsQuestions,
      taxCreditContainsQuestions,
    ];

    const sufficientCategories: boolean[] = noOfCategories.filter((state) => {
      return state === true;
    });

    //4. Check to determine number of question keys returned
    if (sufficientCategories.length >= 2) {
      if (mediumConfidenceQuestions.length === 2) {
        //a. Returning two question keys if only two present
        const shuffledArray = this.shuffleArray(mediumConfidenceQuestions);
        return [shuffledArray[0], shuffledArray[1]];
      } else if (mediumConfidenceQuestions.length > 2) {
        //b. If more than two quesion keys are present, array is shuffled and first three question keys returned
        const shuffledArray = this.shuffleArray(mediumConfidenceQuestions);
        return [shuffledArray[0], shuffledArray[1], shuffledArray[2]];
      }
    }
    //c. Returning empty array when less than two categories present
    return [];
  }

  private shuffleArray(array: Question[]): Question[] {
    const shuffledArray: Question[] = [];

    while (shuffledArray.length < array.length) {
      const randomQuestion: Question = this.getRandomItem(array);
      if (!shuffledArray.includes(randomQuestion)) {
        shuffledArray.push(randomQuestion);
      }
    }
    return shuffledArray;
  }

  private getRandomItem(array: Question[]): Question {
    const rand1 = Math.floor(Math.random() * array.length); // NOSONAR
    return array[rand1];
  }
}
