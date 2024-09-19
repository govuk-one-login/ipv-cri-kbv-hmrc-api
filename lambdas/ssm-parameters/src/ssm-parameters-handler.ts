import { SessionItem } from "../../../lib/src/types/common-types";
import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { getParametersByName } from "@aws-lambda-powertools/parameters/ssm";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { Context } from "aws-lambda";
import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { StrategyUtil, Strategy } from "./types/strategy";

const cacheMinMinutes =
  Number(process.env.CONFIG_SERVICE_SSM_OPTIMIZED_CACHE_AGE_MIN_MINUTES) || 5;
const cacheMaxMinutes =
  Number(process.env.CONFIG_SERVICE_SSM_OPTIMIZED_CACHE_AGE_MAX_MINUTES) || 15;

const logHelper = new LogHelper("SsmParametersHandler");

export class SsmParametersHandler implements LambdaInterface {
  private metricsProbe: MetricsProbe;

  private randomMaxAgeInSeconds: number;

  constructor(metricsProbe: MetricsProbe) {
    this.metricsProbe = metricsProbe;

    // Must calulate in seconds
    const randomValue = Math.random(); // NOSONAR
    this.randomMaxAgeInSeconds = Math.floor(
      randomValue * (cacheMaxMinutes * 60 - cacheMinMinutes * 60 + 1) +
        cacheMinMinutes * 60
    );

    logHelper.info(
      `PowerTools maxAge selected as ${this.randomMaxAgeInSeconds} seconds`
    );
  }

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(
    event: { requestedParameters: string[]; sessionItem: SessionItem },
    _context: Context
  ): Promise<object | { error: string }> {
    try {
      logHelper.setSessionItemToLogging(event.sessionItem);

      const strategy: Strategy = StrategyUtil.fromClientIdString(
        event.sessionItem.clientId
      );

      logHelper.info(`Strategy in use : ${strategy}`);

      if (!Array.isArray(event.requestedParameters)) {
        throw new Error("requestedParameters must be string array");
      }

      if (event.requestedParameters.length == 0) {
        throw new Error("requestedParameters array was empty");
      }

      const { _errors: errors, ...parameters } =
        await getParametersByName<string>(
          Object.fromEntries(
            event.requestedParameters.map((parameter) => [parameter, {}])
          ),
          { maxAge: this.randomMaxAgeInSeconds, throwOnError: false }
        );

      if (errors?.length) {
        const errorMessage = `Following SSM parameters do not exist: ${errors.join(
          ", "
        )}`;
        logHelper.error(errorMessage);
        throw new Error(errorMessage);
      }

      logHelper.info("Returning Result");
      const result = {};
      event.requestedParameters.forEach(function (path: string) {
        // remove path from parameter
        const tkey = path.slice(path.lastIndexOf("/") + 1);
        // Convention is lower case first leter in all keys
        const key = tkey.charAt(0).toLowerCase() + tkey.slice(1);
        // value returned
        const value = parameters[path];

        Object.assign(result, {
          [key]: { value: value },
        });
      });

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      return { result: result };
    } catch (error: any) {
      const lambdaName = SsmParametersHandler.name;
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
}

const metricProbe = new MetricsProbe();
const handlerClass = new SsmParametersHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
