import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";
import { StopWatch } from "../../../../lib/src/Service/stop-watch";

import { OTGToken } from "../../../../lib/src/types/otg-token-types";
import { LogHelper } from "../../../../lib/src/Logging/log-helper";

enum OTGTokenRetrievalServiceMetrics {
  FailedToRetrieveOTGToken = "FailedToRetrieveOTGToken",
}

const ServiceName: string = "OTGTokenRetrievalService";
const logHelper = new LogHelper("OTGTokenRetrievalService");

export class OTGTokenRetrievalService {
  metricsProbe: MetricsProbe;
  stopWatch: StopWatch;

  constructor(metricProbe: MetricsProbe) {
    this.metricsProbe = metricProbe;
    this.stopWatch = new StopWatch();
  }

  public async retrieveToken(otgApiUrl: string): Promise<OTGToken> {
    return await this.performAPIRequest(otgApiUrl);
  }

  private async performAPIRequest(otgApiUrl: string): Promise<OTGToken> {
    logHelper.info("Performing API Request");

    // Response Latency (Start)
    this.stopWatch.start();

    return await fetch(otgApiUrl, {
      method: "GET",
    })
      .then(async (response) => {
        // Happy Path Response Latency
        const latency: number = this.captureResponseLatencyMetric();

        logHelper.info(
          `API Response Status Code: ${response.status}, Latency : ${latency}`
        );

        // Response Status code
        this.metricsProbe.captureServiceMetric(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          ServiceName,
          MetricUnit.Count,
          response.status
        );

        switch (response.status) {
          case 200: {
            return await this.retrieveJSONResponse(response)
              .then((tokenResponse: OTGToken) => {
                logHelper.debug(
                  `TOKEN REPONSE - ${JSON.stringify(tokenResponse)}`
                );

                this.metricsProbe.captureServiceMetric(
                  HTTPMetric.ResponseValidity,
                  Classification.HTTP,
                  ServiceName,
                  MetricUnit.Count,
                  ResponseValidity.Valid
                );
                return tokenResponse;
              })
              .catch((error: Error) => {
                const subError: string = error.message;

                const errorText: string = `Unable to parse json from response ${subError}`;

                throw new Error(errorText);
              });
          }
          case 401: {
            const errorText: string = await Promise.resolve(response.text());
            throw new Error(
              `${response.status} - service not autheticated - ${errorText}`
            );
          }
          case 403: {
            // Connection rejected - check we are on the allow list
            const errorText: string = await Promise.resolve(response.text());
            throw new Error(
              `${response.status} - service not on the allow list - ${errorText}`
            );
          }
          default: {
            // any other status code
            const errorText: string = await Promise.resolve(response.text());

            throw new Error(
              `${response.status} - unexpected Response - ${errorText}`
            );
          }
        }
      })
      .catch((error: Error) => {
        // All errors caught in this top level catch

        // Token Failure alarm
        this.metricsProbe.captureServiceMetric(
          OTGTokenRetrievalServiceMetrics.FailedToRetrieveOTGToken,
          Classification.SERVICE_SPECIFIC,
          ServiceName,
          MetricUnit.Count,
          1
        );

        this.metricsProbe.captureServiceMetric(
          HTTPMetric.ResponseValidity,
          Classification.HTTP,
          ServiceName,
          MetricUnit.Count,
          ResponseValidity.Invalid
        );

        // Error Path Response Latency
        const latency: number = this.captureResponseLatencyMetric();

        // any other status code
        const errorText: string = `API Request Failed : ${error.message}`;

        logHelper.error(`${errorText}, Latency : ${latency}`);

        throw new Error(errorText);
      });
  }

  private async retrieveJSONResponse(response: Response): Promise<OTGToken> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const apiReponse: unknown = await response.json();
      const otgToken: OTGToken = apiReponse as OTGToken;

      if (!otgToken.expiry || !otgToken.token) {
        const response: string = JSON.stringify(apiReponse);

        throw new Error(`Api Response is not an OTGToken - ${response}`);
      }

      return otgToken;
    } else {
      // Not logged as caught in caller
      const errorText: string = `unexpected content type : ${contentType}`;
      throw new Error(errorText);
    }
  }

  private captureResponseLatencyMetric(): number {
    // Response Latency (End)
    const latency: number = this.stopWatch.stop();
    this.metricsProbe.captureServiceMetric(
      HTTPMetric.ResponseLatency,
      Classification.HTTP,
      ServiceName,
      MetricUnit.Count,
      latency
    );

    return latency;
  }
}
