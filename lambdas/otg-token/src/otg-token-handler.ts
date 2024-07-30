import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { OTGToken } from "./types/otg-token-types";
import { OTGTokenRetrievalService } from "./services/otg-token-retrieval-service";

const logger = new Logger({ serviceName: "OTGTokenHandler" });

export class OTGTokenHandler implements LambdaInterface {
  metricsProbe: MetricsProbe;
  otgTokenRetrievalService: OTGTokenRetrievalService;

  constructor(
    metricsProbe: MetricsProbe,
    otgTokenRetrievalService: OTGTokenRetrievalService
  ) {
    this.metricsProbe = metricsProbe;
    this.otgTokenRetrievalService = otgTokenRetrievalService;
  }

  @logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      logger.info("handler start");

      const otgApiUrl: string = event?.parameters?.otgApiUrl?.value;
      logger.debug(`OTG url ${otgApiUrl}`);

      if (!otgApiUrl) {
        throw new Error("otgApiUrl was not provided");
      }

      const otgToken: OTGToken =
        await this.otgTokenRetrievalService.retrieveToken(otgApiUrl);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      logger.info("Returning Token");

      // Token response returned to the calling statemachine
      return otgToken;
    } catch (error: any) {
      const lambdaName = OTGTokenHandler.name;
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
const handlerClass = new OTGTokenHandler(
  metricProbe,
  new OTGTokenRetrievalService(metricProbe)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
