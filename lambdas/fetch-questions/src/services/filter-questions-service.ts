import { Logger } from "@aws-lambda-powertools/logger";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Question } from "../types/questions-result-types";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";

const ServiceName: string = "FilterQuestionService";
const logger = new Logger({ serviceName: `${ServiceName}` });

// Categories for Metrics
const RtiP60PayslipQuestionKeys: string[] = [
  "rti-p60-payment-for-year",
  "rti-p60-employee-ni-contributions",
  "rti-p60-earnings-above-pt",
  "rti-p60-statutory-maternity-pay",
  "rti-p60-statutory-shared-parental-pay",
  "rti-p60-statutory-adoption-pay",
  "rti-p60-student-loan-deductions",
  "rti-p60-postgraduate-loan-deductions",
  "rti-payslip-income-tax",
  "rti-payslip-national-insurance",
];
const SelfAssessmentQuestionKeys: string[] = [
  "sa-income-from-pensions",
  "sa-payment-details",
];
const TaxCreditsQuestionKeys: string[] = ["ita-bankaccount", "tc-amount"];

// Note: Pre/Post is prefixed to these
enum FilterQuestionsServiceMetrics {
  FilteringQuestionKeyCount = "FilteringQuestionKeyCount",
  FilteringCategoryCount = "FilteringCategoryCount",
  RtiP60PayslipCategory = "RtiP60PayslipCategory",
  SelfAssessmentCategory = "SelfAssessmentCategory",
  TaxCreditsCategory = "TaxCreditsCategory",
  UnknownCategory = "UnknownCategory",
}

export class FilterQuestionsService {
  metricsProbe: MetricsProbe;

  constructor(metricProbe: MetricsProbe) {
    this.metricsProbe = metricProbe;
  }

  public async filterQuestions(questions: Question[]): Promise<Question[]> {
    // Capture PRE filter question metrics on questions
    this.captureFilteringMetrics(questions, true);

    // Do the question key filtering
    const filteredQuestions: Question[] = await this.filter(questions);

    // Capture POST filter question metrics on filteredQuestions
    this.captureFilteringMetrics(filteredQuestions, false);

    return filteredQuestions;
  }

  private async filter(questions: Question[]): Promise<Question[]> {
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
    logger.info(
      "questions returned paye " +
        payeCategory.length +
        " sa " +
        selfAssessmentCategory.length +
        " tax " +
        taxCreditCategory.length
    );
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
        logger.info(
          "2 questions selected " +
            JSON.stringify([shuffledArray[0], shuffledArray[1]])
        );
        return [shuffledArray[0], shuffledArray[1]];
      } else if (mediumConfidenceQuestions.length > 2) {
        //b. If more than two quesion keys are present, array is shuffled and first three question keys returned
        const shuffledArray = this.shuffleArray(mediumConfidenceQuestions);
        logger.info(
          "3 questions selected " +
            JSON.stringify([
              shuffledArray[0],
              shuffledArray[1],
              shuffledArray[2],
            ])
        );
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

  private getMetricCategoryForMetric(questionKey: string): string {
    if (RtiP60PayslipQuestionKeys.includes(questionKey)) {
      return FilterQuestionsServiceMetrics.RtiP60PayslipCategory;
    } else if (SelfAssessmentQuestionKeys.includes(questionKey)) {
      return FilterQuestionsServiceMetrics.SelfAssessmentCategory;
    } else if (TaxCreditsQuestionKeys.includes(questionKey)) {
      return FilterQuestionsServiceMetrics.TaxCreditsCategory;
    } else {
      return FilterQuestionsServiceMetrics.UnknownCategory;
    }
  }

  private captureFilteringMetrics(questions: Question[], isPre: boolean) {
    // Are metrics for Pre or Post filtering
    let prefix: string = isPre ? "Pre" : "Post";
    let questionCountMetric: string =
      prefix + FilterQuestionsServiceMetrics.FilteringQuestionKeyCount;
    let categoryCountMetric: string =
      prefix + FilterQuestionsServiceMetrics.FilteringCategoryCount;

    // Question count
    this.metricsProbe.captureServiceMetric(
      questionCountMetric,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnit.Count,
      questions.length
    );

    // Count the questions in each category
    const categoryCounts: { [key: string]: number } = {};
    questions.forEach((question: Question) => {
      const metricCategory = this.getMetricCategoryForMetric(
        question.questionKey
      );

      // Ensure we are working with numerics by initializing before the later addition
      if (categoryCounts[metricCategory] == null) {
        categoryCounts[metricCategory] = 0;
      }

      categoryCounts[metricCategory] = categoryCounts[metricCategory] + +1;
    });

    const keys: string[] = Object.keys(categoryCounts);

    // Count of categories
    this.metricsProbe.captureServiceMetric(
      categoryCountMetric,
      Classification.SERVICE_SPECIFIC,
      ServiceName,
      MetricUnit.Count,
      keys.length
    );

    // Send the total counts for each category
    keys.forEach((key) => {
      this.metricsProbe.captureServiceMetric(
        prefix + key,
        Classification.SERVICE_SPECIFIC,
        ServiceName,
        MetricUnit.Count,
        categoryCounts[key]
      );
    });
  }
}
