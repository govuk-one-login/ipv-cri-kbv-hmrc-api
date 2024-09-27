import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { unmarshall } from "@aws-sdk/util-dynamodb";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";

import { DynamoUnmarshallInputs } from "./dynamo-unmarshall-handler-types";
import { SessionItem } from "../../../lib/src/types/common-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

const logHelper = new LogHelper("DynamoUnmarshallHandler");

export class DynamoUnmarshallHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;

  constructor(metricsProbe: MetricsProbe) {
    this.metricsProbe = metricsProbe;
  }
  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logHelper.debug(JSON.stringify(event));

      const input: DynamoUnmarshallInputs =
        this.safeRetrieveLambdaEventInputs(event);

      // sessionItem must be completely optional as we could be unmashalling it
      logHelper.setSessionItemToLogging(input?.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input?.sessionItem?.sessionId}`
      );

      const unmarshalled = unmarshall(input.marshalledPayload);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      return unmarshalled;
    } catch (error: any) {
      const lambdaName = DynamoUnmarshallHandler.name;
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

  private safeRetrieveLambdaEventInputs(event: any): DynamoUnmarshallInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    const marshalledPayload = event.marshalledPayload;
    if (!marshalledPayload) {
      throw new Error("Marshalled payload not found");
    }

    // A missing sessionItem cannot be an error - as this lambda is used to unmarshall it
    const sessionItem = event?.sessionItem;
    if (!sessionItem) {
      logHelper.warn("Session item was not provided");
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
      marshalledPayload: marshalledPayload,
    } as DynamoUnmarshallInputs;
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const handlerClass = new DynamoUnmarshallHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
