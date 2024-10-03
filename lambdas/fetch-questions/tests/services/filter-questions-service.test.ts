import { FilterQuestionsService } from "../../src/services/filter-questions-service";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { Question } from "../../src/types/questions-result-types";
import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

// For Custom InRange Matcher
import "../jest.custom";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");

describe("FilterQuestionsService", () => {
  process.env.QUESTIONS_TABLE_NAME = "QUESTIONS_TABLE_NAME";
  let service: FilterQuestionsService;

  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    service = new FilterQuestionsService(mockMetricsProbe.prototype);
  });

  // NOTE: The return of this test can be 3 questions from 2 or 3 categories
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

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      5
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      3
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreTaxCreditsCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreSelfAssessmentCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      3
    );

    // can be 2 or 3 categories depending on filtering
    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.toBeWithinRange(2, 3)
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
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

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      3
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreSelfAssessmentCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      3
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
  });

  it("Happy Path 2 questions, 2 categories", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("sa-payment-details", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(2);

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreSelfAssessmentCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
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

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      4
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      4
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
  });

  it("Unhappy Path 2 questions, 1 category", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
      new Question("rti-payslip-income-tax", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
  });

  it("Unhappy Path 1 question", async () => {
    const allQuestionsArray: Question[] = [
      new Question("rti-p60-payment-for-year", undefined, undefined),
    ];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
  });

  it("Unhappy Path no questions", async () => {
    const allQuestionsArray: Question[] = [];
    const filteredQuestionsCount =
      await service.filterQuestions(allQuestionsArray);
    expect(filteredQuestionsCount.length).toEqual(0);

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
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

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      3
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreRtiP60PayslipCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      2
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PreTaxCreditsCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      1
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringQuestionKeyCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
      "PostFilteringCategoryCount",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      0
    );

    // Ensure our mappings are known
    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PreUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );

    expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
      "PostUnknownCategory",
      Classification.SERVICE_SPECIFIC,
      "FilterQuestionService",
      MetricUnit.Count,
      expect.any(Number)
    );
  });
});
