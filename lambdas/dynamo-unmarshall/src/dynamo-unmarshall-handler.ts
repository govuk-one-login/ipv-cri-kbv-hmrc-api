import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
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

const logger = new Logger({ serviceName: "DynamoUnmarshallHandler" });

export class DynamoUnmarshallHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;

  constructor(metricsProbe: MetricsProbe) {
    this.metricsProbe = metricsProbe;
  }
  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logger.debug(JSON.stringify(event));

      const marshalledPayload = event.marshalledPayload;

      if (!marshalledPayload) {
        throw new Error("Marshalled payload not found");
      }

      const unmarshalled = unmarshall(event.marshalledPayload);

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
      logger.error(errorMessage);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      // Indicate to the statemachine a lambda error has occured
      return { error: errorMessage };
    }
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const handlerClass = new DynamoUnmarshallHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
