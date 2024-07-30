import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  HTTPMetric,
  ResponseValidity,
} from "../../../../lib/src/MetricTypes/http-service-metrics";

import { Classification } from "../../../../lib/src/MetricTypes/metric-classifications";
import { MetricsProbe } from "../../../../lib/src/Service/metrics-probe";

import { OTGToken } from "../../src/types/otg-token-types";
import { OTGTokenRetrievalService } from "../../src/services/otg-token-retrieval-service";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../../../../lib/src/Service/metrics-probe");
jest.mock("node-fetch");

enum OTGTokenRetrievalServiceMetrics {
  FailedToRetrieveOTGToken = "FailedToRetrieveOTGToken",
}

describe("OTGTokenRetrievalService", () => {
  let otgTokenRetrievalService: OTGTokenRetrievalService;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockCaptureServiceMetricMetricsProbeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);

    mockCaptureServiceMetricMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureServiceMetric"
    );

    otgTokenRetrievalService = new OTGTokenRetrievalService(
      mockMetricsProbe.prototype
    );
  });

  describe("Success Scenarios", () => {
    it("should return OTGToken if request is successfull", async () => {
      const apiResponse = {
        token: "test-token-value",
        expiry: Date.now() + 7200 * 1000,
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "application/json";
            }),
          },
          json: () => Promise.resolve(apiResponse),
        })
      ) as jest.Mock;

      const otgToken: OTGToken = await otgTokenRetrievalService.retrieveToken(
        "http://example.com/token?tokenType=unitTest"
      );

      expect(apiResponse.token).toEqual(otgToken.token);
      expect(apiResponse.expiry).toEqual(otgToken.expiry);

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        200
      );

      // Alarm NOT to be fired
      expect(mockCaptureServiceMetricMetricsProbeSpy).not.toHaveBeenCalledWith(
        OTGTokenRetrievalServiceMetrics.FailedToRetrieveOTGToken,
        Classification.SERVICE_SPECIFIC,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        1
      );

      // Response to be valid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        ResponseValidity.Valid
      );
    });
  });

  describe("Failure Scenarios", () => {
    // The following tests test the lambda being called missing parts of the requried input
    // and checks the assoicated error is thrown
    it.each([
      [500, '{ message : "A Server Error Occured"}', "unexpected Response"],
      [401, '{ message : "Access Denied"}', "service not autheticated"],
      [403, '{ message : "Forbidden"}', "service not on the allow list"],
    ])(
      "should return error when lambda not provided an otgApiUrl",
      async (
        errorStatusCode: number,
        apiResponse: any,
        errorMessage: string
      ) => {
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: errorStatusCode,
            headers: {
              get: jest.fn(() => {
                return "application/json";
              }),
            },
            text: () => Promise.resolve(apiResponse),
          })
        ) as jest.Mock;

        await expect(
          otgTokenRetrievalService.retrieveToken(
            "http://example.com/token?tokenType=unitTest"
          )
        ).rejects.toEqual(
          new Error(
            `API Request Failed : ${errorStatusCode} - ${errorMessage} - ` +
              apiResponse
          )
        );

        // Latency Metric
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.ResponseLatency,
          Classification.HTTP,
          "OTGTokenRetrievalService",
          MetricUnit.Count,
          expect.any(Number)
        );

        // Status code
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.HTTPStatusCode,
          Classification.HTTP,
          "OTGTokenRetrievalService",
          MetricUnit.Count,
          errorStatusCode
        );

        // Alarm to be fired
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          OTGTokenRetrievalServiceMetrics.FailedToRetrieveOTGToken,
          Classification.SERVICE_SPECIFIC,
          "OTGTokenRetrievalService",
          MetricUnit.Count,
          1
        );

        // Response to be valid
        expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
          HTTPMetric.ResponseValidity,
          Classification.HTTP,
          "OTGTokenRetrievalService",
          MetricUnit.Count,
          ResponseValidity.Invalid
        );
      }
    );

    it("should return Error if response is not an OTGToken", async () => {
      const apiResponse = {
        NOT_TOKEN: "test-token-value",
        NOT_EXPIRY: Date.now() + 7200 * 1000,
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "application/json";
            }),
          },
          json: () => Promise.resolve(apiResponse),
        })
      ) as jest.Mock;

      await expect(
        otgTokenRetrievalService.retrieveToken(
          "http://example.com/token?tokenType=unitTest"
        )
      ).rejects.toEqual(
        new Error(
          `API Request Failed : Unable to parse json from response Api Response is not an OTGToken - ` +
            JSON.stringify(apiResponse)
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        200
      );

      // Alarm to be fired
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        OTGTokenRetrievalServiceMetrics.FailedToRetrieveOTGToken,
        Classification.SERVICE_SPECIFIC,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        1
      );

      // Response to be invalid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        ResponseValidity.Invalid
      );
    });

    it("should return Error if response content is not json", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          headers: {
            get: jest.fn(() => {
              return "text/html";
            }),
          },
        })
      ) as jest.Mock;

      await expect(
        otgTokenRetrievalService.retrieveToken(
          "http://example.com/token?tokenType=unitTest"
        )
      ).rejects.toEqual(
        new Error(
          "API Request Failed : Unable to parse json from response unexpected content type : text/html"
        )
      );

      // Latency Metric
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseLatency,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        expect.any(Number)
      );

      // Status code
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.HTTPStatusCode,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        200
      );

      // Alarm to be fired
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        OTGTokenRetrievalServiceMetrics.FailedToRetrieveOTGToken,
        Classification.SERVICE_SPECIFIC,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        1
      );

      // Response to be invalid
      expect(mockCaptureServiceMetricMetricsProbeSpy).toHaveBeenCalledWith(
        HTTPMetric.ResponseValidity,
        Classification.HTTP,
        "OTGTokenRetrievalService",
        MetricUnit.Count,
        ResponseValidity.Invalid
      );
    });
  });
});
