import { VerificationScoreCalculator } from "../../../submit-answer/src/utils/verification-score-calculator";

const testAnswerResult3CorrectAnswers = [
  {
    questionKey: "rti-p60-payment-for-year",
    status: "incorrect",
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

const testAnswerResult2CorrectAnswers = [
  {
    questionKey: "rti-p60-payment-for-year",
    status: "incorrect",
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
  let verificationScoreCalculator: VerificationScoreCalculator;

  beforeEach(() => {
    jest.clearAllMocks();

    verificationScoreCalculator = new VerificationScoreCalculator();
  });

  it("Success With Verifification Score 2 when 3 correct answers", async () => {
    console.log(testAnswerResult1CorrectAnswers);
    const verificationScore =
      verificationScoreCalculator.calculateVerificationScore(
        testAnswerResult3CorrectAnswers
      );

    expect(verificationScore).toBe(2);
  });

  it("Success With VerifificationScore 2 when 2 correct Answers", async () => {
    const verificationScore =
      verificationScoreCalculator.calculateVerificationScore(
        testAnswerResult2CorrectAnswers
      );

    expect(verificationScore).toBe(2);
  });

  it("Success With VerifificationScore 0 when 1 correct Answers", async () => {
    const verificationScore =
      verificationScoreCalculator.calculateVerificationScore(
        testAnswerResult1CorrectAnswers
      );

    expect(verificationScore).toBe(0);
  });
});
