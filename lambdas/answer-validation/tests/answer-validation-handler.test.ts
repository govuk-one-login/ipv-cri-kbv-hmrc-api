import { AnswerValidationHandler } from "../src/answer-validation-handler";


const mockInputContext = {
  invokedFunctionArn: "test",
};

describe("AnswerValidationHandler", () => {
  it("should return true for correct pound validation", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "rti-p60-earnings-above-pt",
      value: "123",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect pound validation", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "sa-income-from-pensions",
      value: "123.87",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: false });
  });

  it("should return true for incorrect penny validation", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "rti-payslip-national-insurance",
      value: "123.87",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect penny validation", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "rti-payslip-income-tax",
      value: "1238.7",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: false });
  });

  it("should return false for incorrect penny validation in pounds", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "rti-payslip-income-tax",
      value: "12387",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: false });
  });

  it("should return true for correct Self Assessment validation", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "sa-payment-details",
      value:
        '{"questionKey": "sa-payment-details","answer": "{\\"amount\\": 300.00,\\"paymentDate\\": \\"2010-01-01\\"}"}',
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: true });
  });

  it("should return false for incorrect Self Assessment validation in pounds", async () => {
    const handler = new AnswerValidationHandler();

    const event = {
      key: "sa-payment-details",
      value: "This is not a Json",
    };
    const result = await handler.handler(event, mockInputContext);
    expect(result).toEqual({ validated: false });
  });
});
