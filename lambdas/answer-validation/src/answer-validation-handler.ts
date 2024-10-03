import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { SessionItem } from "../../../lib/src/types/common-types";
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";
import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { AnswerValidationInputs } from "./answer-validation-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

const logHelper = new LogHelper("AnswerValidationHandler");

export class AnswerValidationHandler implements LambdaInterface {
  constructor(private readonly metricsProbe: MetricsProbe) {}

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      let result: boolean = false;

      const input: AnswerValidationInputs =
        this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      if (
        input.key === "rti-p60-earnings-above-pt" ||
        input.key === "rti-p60-postgraduate-loan-deductions" ||
        input.key === "rti-p60-student-loan-deductions" ||
        input.key === "sa-income-from-pensions"
      ) {
        result = poundValidation(input);
      } else if (input.key === "sa-payment-details") {
        result = sAPaymentValidation(input);
      } else {
        result = penceValidation(input);
      }
      logHelper.info("Validation complete");

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      return { validated: result };
    } catch (error: any) {
      const lambdaName = AnswerValidationHandler.name;
      const errorText: string = error.message;

      const errorMessage = `${lambdaName} : ${errorText}`;
      logHelper.error(errorMessage);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      // Indicate to the statemachine a lambda error has occured
      return { error: errorMessage };
    }
  }

  private safeRetrieveLambdaEventInputs(event: any): AnswerValidationInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    const key = event.key;
    if (!key) {
      throw new Error("key not found");
    }

    const value = event.value;
    if (!value) {
      throw new Error("value not found");
    }

    // Session
    const sessionItem = event?.sessionItem;
    if (!sessionItem) {
      throw new Error("Session item was not provided");
    } else {
      // Will throw errors on failure
      SharedInputsValidator.validateUnmarshalledSessionItem(event.sessionItem);
    }

    // State machine values for logging
    const statemachine = event.statemachine;
    if (!statemachine) {
      throw new Error("Statemachine values not found");
    }

    return {
      sessionItem: sessionItem as SessionItem,
      statemachine: statemachine as Statemachine,
      key: key,
      value: value,
    } as AnswerValidationInputs;
  }
}
export function poundValidation(input: AnswerValidationInputs): boolean {
  if (/^(\d{0,12})$/.exec(input.value)) {
    logHelper.info("Validation in Pounds sucess");
    return true;
  } else {
    logHelper.info("Validation in Pounds failed");
    return false;
  }
}

export function penceValidation(input: AnswerValidationInputs): boolean {
  if (/^\d*\.\d{2}$/.exec(input.value)) {
    logHelper.info("Validation in Pence success");
    return true;
  } else {
    logHelper.info("Validation in Pence failed");
    return false;
  }
}

export function sAPaymentValidation(input: AnswerValidationInputs): boolean {
  if (input.value.length > 200) {
    logHelper.info("Input is too long");
    return false;
  }

  try {
    logHelper.info("Parsing Json:");
    JSON.parse(input.value);
    return true;
  } catch (error) {
    logHelper.info(`Parsing Json failed for ${input.key} - ${error}`);
    return false;
  }
}

const metricProbe = new MetricsProbe();
const handlerClass = new AnswerValidationHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
