import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { OTGTokenHandler } from "../src/otg-token-handler";
import { OTGToken } from "../../../lib/src/types/otg-token-types";
import { OTGTokenRetrievalService } from "../src/services/otg-token-retrieval-service";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { SessionItem } from "../../../lib/src/types/common-types";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

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

  const testSessionItem: SessionItem = {
    expiryDate: 1234,
    clientIpAddress: "127.0.0.1",
    redirectUri: "http://localhost:8085/callback",
    clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
    createdDate: 1722954983024,
    clientId: "unit-test-clientid",
    subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
    persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
    attemptCount: 0,
    sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
    state: "7f42f0cc-1681-4455-872f-dd228103a12e",
  };

  const testStateMachineValue: Statemachine = {
    executionId:
      "arn:aws:states:REGION:ACCOUNT:express:STACK-LAMBDA:EXECUTIONID_PART1:EXECUTIONID_PART2",
  };

  const mockInputEvent = {
    sessionItem: testSessionItem,
    statemachine: testStateMachineValue,
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
      [
        { sessionItem: testSessionItem, statemachine: testStateMachineValue },
        "otgApiUrl was not provided",
      ],
      [
        {
          sessionItem: testSessionItem,
          statemachine: testStateMachineValue,
          parameters: undefined,
        },
        "otgApiUrl was not provided",
      ],
      [
        {
          sessionItem: testSessionItem,
          statemachine: testStateMachineValue,
          parameters: {
            otgApiUrl: undefined,
          },
        },
        "otgApiUrl was not provided",
      ],
      [
        {
          sessionItem: testSessionItem,
          statemachine: testStateMachineValue,
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

    it("should return an error on no input event", async () => {
      global.fetch = jest.fn();

      const lambdaResponse = await otgTokenHandler.handler(
        undefined,
        mockInputContext
      );
      expect(lambdaResponse).toEqual({
        error: "OTGTokenHandler : input event is empty",
      });

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });

    it("should return an error on no statemachine in input event", async () => {
      global.fetch = jest.fn();

      const lambdaResponse = await otgTokenHandler.handler(
        {
          sessionItem: testSessionItem,
          parameters: {
            otgApiUrl: {
              value: "https://example.com/dev?tokenType=unitTest",
            },
          },
        },
        mockInputContext
      );
      expect(lambdaResponse).toEqual({
        error: "OTGTokenHandler : Statemachine values not found",
      });

      expect(mockMetricsProbeSpy).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });
  });
});
