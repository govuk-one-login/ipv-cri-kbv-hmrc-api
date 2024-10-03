import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";
import { SessionItem } from "../../../lib/src/types/common-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { CreateAuthCodeInputs } from "./create-auth-code-types";
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

const logHelper = new LogHelper("CreateAuthCodeHandler");
const DEFAULT_AUTHORIZATION_CODE_TTL_IN_MILLIS = 600 * 1000;

export class CreateAuthCodeHandler implements LambdaInterface {
  private readonly metricsProbe: MetricsProbe;

  constructor(metricsProbe: MetricsProbe) {
    this.metricsProbe = metricsProbe;
  }

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<any> {
    try {
      const input: CreateAuthCodeInputs =
        this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const response = {
        authCodeExpiry: Math.floor(
          (Date.now() + DEFAULT_AUTHORIZATION_CODE_TTL_IN_MILLIS) / 1000
        ),
      };

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      return response;
    } catch (error: any) {
      const lambdaName = CreateAuthCodeHandler.name;
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

  private safeRetrieveLambdaEventInputs(event: any): CreateAuthCodeInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    // Session - Will throw errors on failure
    const sessionItem = event.sessionItem;
    SharedInputsValidator.validateUnmarshalledSessionItem(event.sessionItem);

    // State machine values for logging
    const statemachine = event.statemachine;
    if (!statemachine) {
      throw new Error("Statemachine values not found");
    }

    return {
      sessionItem: sessionItem as SessionItem,
      statemachine: statemachine as Statemachine,
    } as CreateAuthCodeInputs;
  }
}

// Handler export
const metricProbe = new MetricsProbe();
const handlerClass = new CreateAuthCodeHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
