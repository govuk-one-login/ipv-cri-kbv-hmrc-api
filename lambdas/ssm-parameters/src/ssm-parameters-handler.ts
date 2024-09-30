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

import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";

import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { StrategyUtil, Strategy } from "./types/strategy";
import { SsmParametersInputs } from "./types/ssm-parameters-handler-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

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
    event: {
      sessionItem: SessionItem;
      statemachine: Statemachine;
      requestedParameters: string[];
    },
    _context: Context
  ): Promise<object | { error: string }> {
    try {
      const input: SsmParametersInputs =
        this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      const strategy: Strategy = StrategyUtil.fromClientIdString(
        input.sessionItem.clientId
      );

      logHelper.info(`Strategy in use : ${strategy}`);

      const { _errors: errors, ...parameters } =
        await getParametersByName<string>(
          Object.fromEntries(
            input.requestedParameters.map((parameter) => [parameter, {}])
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

      logHelper.debug("Creating Result");
      const result = {};
      input.requestedParameters.forEach((path: string) => {
        // remove path from parameter
        const tkey = path.slice(path.lastIndexOf("/") + 1);
        // Convention is lower case first leter in all keys
        const key = tkey.charAt(0).toLowerCase() + tkey.slice(1);
        // value returned
        const value = this.retrieveParameterValue(
          key,
          parameters[path],
          strategy
        );

        Object.assign(result, {
          [key]: { value: value },
        });
      });

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      logHelper.info("Returning Result");

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

  private safeRetrieveLambdaEventInputs(event: any): SsmParametersInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    const requestedParameters = event.requestedParameters;
    if (!Array.isArray(event.requestedParameters)) {
      throw new Error("requestedParameters must be string array");
    }
    if (requestedParameters.length == 0) {
      throw new Error("requestedParameters array was empty");
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
      requestedParameters: requestedParameters,
    } as SsmParametersInputs;
  }

  private retrieveParameterValue(
    key: string,
    unprocessedValue: string,
    strategy: Strategy
  ): string {
    if (this.unprocessedValueContainsStrategyConfig(unprocessedValue)) {
      try {
        const json = JSON.parse(unprocessedValue);

        logHelper.debug(`${key} value contained strategy json`);
        return json[strategy];
      } catch (error: any) {
        const errorText: string = `Failed to parse json for ${key}`;
        throw new Error(errorText);
      }
    }

    logHelper.debug(`${key} value contained string`);
    return unprocessedValue;
  }

  private unprocessedValueContainsStrategyConfig(
    unprocessedValue: string
  ): boolean {
    return (
      unprocessedValue.includes(Strategy.STUB) &&
      unprocessedValue.includes(Strategy.UAT) &&
      unprocessedValue.includes(Strategy.LIVE)
    );
  }
}

const metricProbe = new MetricsProbe();
const handlerClass = new SsmParametersHandler(metricProbe);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
