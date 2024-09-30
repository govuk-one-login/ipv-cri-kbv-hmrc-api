import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";

import { OTGToken } from "../../../lib/src/types/otg-token-types";
import { OTGTokenRetrievalService } from "./services/otg-token-retrieval-service";
import { OTGTokenInputs } from "./types/otg-token-types";
import { SessionItem } from "../../../lib/src/types/common-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

const logHelper = new LogHelper("OTGTokenHandler");

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

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      const input: OTGTokenInputs = this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const otgToken: OTGToken =
        await this.otgTokenRetrievalService.retrieveToken(input.otgApiUrl);

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      logHelper.info("Returning Token");

      // Token response returned to the calling statemachine
      return otgToken;
    } catch (error: any) {
      const lambdaName = OTGTokenHandler.name;
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

  private safeRetrieveLambdaEventInputs(event: any): OTGTokenInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    const otgApiUrl: string = event?.parameters?.otgApiUrl?.value;
    logHelper.debug(`OTG url ${otgApiUrl}`);

    if (!otgApiUrl) {
      throw new Error("otgApiUrl was not provided");
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
      otgApiUrl: otgApiUrl,
    } as OTGTokenInputs;
  }
}

// Handler Export
const metricProbe = new MetricsProbe();
const handlerClass = new OTGTokenHandler(
  metricProbe,
  new OTGTokenRetrievalService(metricProbe)
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
