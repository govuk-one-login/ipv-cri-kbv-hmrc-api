import { CheckDetailsCountCalculator } from "../../src/utils/check-details-count-calculator";

const testAnswerResult3CorrectAnswers = [
  {
    questionKey: "rti-p60-payment-for-year",
    status: "correct",
  },
  {
    questionKey: "rti-payslip-income-tax",
    status: "correct",
  },
  {
    questionKey: "sa-income-from-pensions",
    status: "correct",
  },
];

const testAnswerResult0CorrectAnswers = [
  {
    questionKey: "rti-p60-payment-for-year",
    status: "incorrect",
  },
  {
    questionKey: "rti-payslip-income-tax",
    status: "incorrect",
  },
  {
    questionKey: "sa-income-from-pensions",
    status: "incorrect",
  },
];

const testAnswerResult1CorrectAnswers = [
  {
    questionKey: "rti-p60-payment-for-year",
    status: "incorrect",
  },
  {
    questionKey: "rti-payslip-income-tax",
    status: "incorrect",
  },
  {
    questionKey: "sa-income-from-pensions",
    status: "correct",
  },
];

describe("IssueCredentialHandler", () => {
  let checkDetailsCountCalculator: CheckDetailsCountCalculator;

  beforeEach(() => {
    jest.clearAllMocks();

    checkDetailsCountCalculator = new CheckDetailsCountCalculator();
  });

  it("Success With checkDetails count of 3 and failedCheckDetails count of 0", async () => {
    const checkDetailsCount = checkDetailsCountCalculator.calculateAnswerCount(
      testAnswerResult3CorrectAnswers,
      "correct"
    );

    const failedCheckDetailsCount =
      checkDetailsCountCalculator.calculateAnswerCount(
        testAnswerResult3CorrectAnswers,
        "incorrect"
      );

    expect(checkDetailsCount).toBe(3);
    expect(failedCheckDetailsCount).toBe(0);
  });

  it("Success With checkDetails count of 0 and failedCheckDetails count of 3", async () => {
    const checkDetailsCount = checkDetailsCountCalculator.calculateAnswerCount(
      testAnswerResult0CorrectAnswers,
      "correct"
    );

    const failedCheckDetailsCount =
      checkDetailsCountCalculator.calculateAnswerCount(
        testAnswerResult0CorrectAnswers,
        "incorrect"
      );

    expect(checkDetailsCount).toBe(0);
    expect(failedCheckDetailsCount).toBe(3);
  });

  it("Success With checkDetails count of 1 and failedCheckDetails count of 2", async () => {
    const checkDetailsCount = checkDetailsCountCalculator.calculateAnswerCount(
      testAnswerResult1CorrectAnswers,
      "correct"
    );

    const failedCheckDetailsCount =
      checkDetailsCountCalculator.calculateAnswerCount(
        testAnswerResult1CorrectAnswers,
        "incorrect"
      );

    expect(checkDetailsCount).toBe(1);
    expect(failedCheckDetailsCount).toBe(2);
  });
});
