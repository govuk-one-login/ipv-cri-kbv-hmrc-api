import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { OTGTokenHandler } from "../src/otg-token-handler";
import { OTGToken } from "../src/types/otg-token-types";
import { OTGTokenRetrievalService } from "../src/services/otg-token-retrieval-service";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/services/otg-token-retrieval-service");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

describe("OTGTokenHandler", () => {
  let otgTokenHandler: OTGTokenHandler;
  let mockMetricsProbe: jest.MockedObjectDeep<typeof MetricsProbe>;

  let mockOTGTokenRetrievalService: jest.MockedObjectDeep<
    typeof OTGTokenRetrievalService
  >;

  let mockMetricsProbeSpy: jest.SpyInstance;
  let otgTokenRetrievalServiceSpy: jest.SpyInstance;

  const mockInputEvent = {
    parameters: {
      otgApiUrl: {
        value: "https://example.com/dev?tokenType=unitTest",
      },
    },
  };

  const mockInputContext = {
    invokedFunctionArn: "test",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe);
    mockOTGTokenRetrievalService = jest.mocked(OTGTokenRetrievalService);

    otgTokenRetrievalServiceSpy = jest.spyOn(
      mockOTGTokenRetrievalService.prototype,
      "retrieveToken"
    );

    mockMetricsProbeSpy = jest.spyOn(
      mockMetricsProbe.prototype,
      "captureMetric"
    );

    otgTokenHandler = new OTGTokenHandler(
      mockMetricsProbe.prototype,
      OTGTokenRetrievalService.prototype
    );
  });

  describe("Success Scenarios", () => {
    it("should return token with expiry when otgTokenRetrievalService returns successfully", async () => {
      const expireTimestamp: number = Date.now() + 7200 * 1000;
      const mockOTGToken = {
        token: "TEST_VALUE",
        expiry: expireTimestamp,
      } as OTGToken;

      otgTokenRetrievalServiceSpy.mockResolvedValue(mockOTGToken);

      const lambdaResponse = await otgTokenHandler.handler(
        mockInputEvent,
        mockInputContext
      );

      expect(otgTokenRetrievalServiceSpy).toHaveBeenCalledWith(
        mockInputEvent.parameters.otgApiUrl.value
      );

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      const expectedResponse = {
        token: "TEST_VALUE",
        expiry: expireTimestamp,
      };

      expect(lambdaResponse).toEqual(expectedResponse);
    });
  });

  describe("Failure Scenarios", () => {
    // The following tests test the lambda being called missing parts of the requried input
    // and checks the assoicated error is thrown
    it.each([
      [undefined, "otgApiUrl was not provided"],
      [{ parameters: undefined }, "otgApiUrl was not provided"],
      [
        {
          parameters: {
            otgApiUrl: undefined,
          },
        },
        "otgApiUrl was not provided",
      ],
      [
        {
          parameters: {
            otgApiUrl: {
              value: undefined,
            },
          },
        },
        "otgApiUrl was not provided",
      ],
    ])(
      "should return error when lambda not provided an otgApiUrl",
      async (testInputEvent: any, expectedError: string) => {
        const lambdaResponse = await otgTokenHandler.handler(
          testInputEvent,
          mockInputContext
        );

        // Should never be called
        expect(otgTokenRetrievalServiceSpy).not.toHaveBeenCalledWith(
          expect.anything()
        );

        expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
          HandlerMetric.CompletionStatus,
          MetricUnit.Count,
          CompletionStatus.ERROR
        );

        const lambdaName = OTGTokenHandler.name;
        const errorMessage = `${lambdaName} : ${expectedError}`;
        const expectedResponse = { error: errorMessage };

        expect(lambdaResponse).toEqual(expectedResponse);
      }
    );

    it("should return error when otgTokenRetrievalService returns error", async () => {
      const testErrorMessage: string =
        "An error was returned from the otgTokenRetrievalService";
      otgTokenRetrievalServiceSpy.mockImplementation(() => {
        throw new Error(testErrorMessage);
      });

      const lambdaResponse = await otgTokenHandler.handler(
        mockInputEvent,
        mockInputContext
      );

      expect(otgTokenRetrievalServiceSpy).toHaveBeenCalledWith(
        mockInputEvent.parameters.otgApiUrl.value
      );

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );

      const lambdaName = OTGTokenHandler.name;
      const errorMessage = `${lambdaName} : ${testErrorMessage}`;
      const expectedResponse = { error: errorMessage };

      expect(lambdaResponse).toEqual(expectedResponse);
    });
  });
});
