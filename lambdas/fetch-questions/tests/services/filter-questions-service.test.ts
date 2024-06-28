import { FilterQuestionsService } from "../../src/services/filter-questions-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Question } from "../../src/types/questions-result-types";

describe("FilterQuestionsService", () => {
  process.env.QUESTIONS_TABLE_NAME = "QUESTIONS_TABLE_NAME";
  let service: FilterQuestionsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const metricsProbe: MetricsProbe = new MetricsProbe();

    service = new FilterQuestionsService(metricsProbe);
  });

  it("Happy Path >3 questions, 3 categories", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
      new Question("ita-bankaccount", undefined, undefined),
      new Question("tc-amount", undefined, undefined),
      new Question("sa-payment-details", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(3);
  });

  it("Happy Path 3 questions, 2 categories", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
      new Question("sa-payment-details", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(3);
  });

  it("Happy Path 2 questions, 2 categories", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("sa-payment-details", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(2);
  });

  it("Unhappy Path >3 questions, 1 category", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
      new Question(
        "rti-p60-statutory-shared-parental-pay",
        undefined,
        undefined
      ),
      new Question(
        "rti-p60-postgraduate-loan-deductions",
        undefined,
        undefined
      ),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);
  });

  it("Unhappy Path 2 questions, 1 category", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-payslip-income-tax", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);
  });

  it("Unhappy Path 1 question", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);
  });

  it("Unhappy Path no questions", async () => {
    const allQuestionsArray: Question[] = [];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);
  });

  it("Unhappy Path 3 questions, 2 categories (low confidence)", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-p60-statutory-adoption-pay", undefined, undefined),
      new Question("ita-bankaccount", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);
  });
});
