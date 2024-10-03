import { Context } from "aws-lambda";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { SessionItem } from "../../../lib/src/types/common-types";
import { AnswerValidationHandler } from "../src/answer-validation-handler";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

describe("AnswerValidationHandler", () => {
  const testSessionItem: SessionItem = {
    expiryDate: 1234,
    clientIpAddress: "127.0.0.1",
    redirectUri: "http://localhost:8085/callback",
    clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
    createdDate: 1722954983024,
    clientId: "unit-test-clientid",
    subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
    persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
    attemptCount: 0,
    sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
    state: "7f42f0cc-1681-4455-872f-dd228103a12e",
  };

  const testStateMachineValue: Statemachine = {
    executionId:
      "arn:aws:states:REGION:ACCOUNT:express:STACK-LAMBDA:EXECUTIONID_PART1:EXECUTIONID_PART2",
  };

  let mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
  let answerValidationHandler: AnswerValidationHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe).prototype;

    jest.spyOn(mockMetricsProbe, "captureMetric");

    answerValidationHandler = new AnswerValidationHandler(mockMetricsProbe);
  });

  it("should return true for correct pound validation", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "rti-p60-earnings-above-pt",
      value: "123",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect pound validation", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "sa-income-from-pensions",
      value: "123.87",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: false });
  });

  it("should return true for incorrect penny validation", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "rti-payslip-national-insurance",
      value: "123.87",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect penny validation", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "rti-payslip-income-tax",
      value: "1238.7",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: false });
  });

  it("should return false for incorrect penny validation in pounds", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "rti-payslip-income-tax",
      value: "12387",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: false });
  });

  it("should return true for correct Self Assessment validation", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "sa-payment-details",
      value:
        '{"questionKey": "sa-payment-details","answer": "{\\"amount\\": 300.00,\\"paymentDate\\": \\"2010-01-01\\"}"}',
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect Self Assessment validation in pounds", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      key: "sa-payment-details",
      value: "This is not a Json",
    };
    const result = await answerValidationHandler.handler(event, {} as Context);
    expect(result).toEqual({ validated: false });
  });
});
