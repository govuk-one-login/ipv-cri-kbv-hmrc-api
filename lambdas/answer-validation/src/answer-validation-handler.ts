import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "AnswerValidationHandler" });

export class AnswerValidationHandler implements LambdaInterface {
  public async handler(event: any, _context: unknown): Promise<object> {
    let result: boolean = false;

    if (
      event.key === "rti-p60-earnings-above-pt" ||
      event.key === "rti-p60-postgraduate-loan-deductions" ||
      event.key === "rti-p60-student-loan-deductions" ||
      event.key === "sa-income-from-pensions"
    ) {
      result = poundValidation(event);
    } else if (event.key === "sa-payment-details") {
      result = sAPaymentValidation(event);
    } else {
      result = penceValidation(event);
    }
    logger.info("The answers have been successfully validated");
    return { validated: result };
  }
}
export function poundValidation(event: any): boolean {
  if (event.value.match(/^([0-9]{0,12})$/)) {
    logger.info("Validation in Pounds");
    return true;
  } else {
    logger.info("Validation in Pounds failed");
    return false;
  }
}

export function penceValidation(event: any): boolean {
  if (event.value.match(/^[0-9]*\.[0-9]{2}$/)) {
    logger.info("Validation including pence");
    return true;
  } else {
    logger.info("Validation in Pence failed");
    return false;
  }
}

export function sAPaymentValidation(event: any): boolean {
  if (event.value.length > 200) {
    logger.info("Input is too long");
    return false;
  }

  try {
    logger.info("Parsing Json:");
    JSON.parse(event.value);
    return true;
  } catch (error) {
    logger.info(`Parsing Json failed ${error}`);
    return false;
  }
}

const handlerClass = new AnswerValidationHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
