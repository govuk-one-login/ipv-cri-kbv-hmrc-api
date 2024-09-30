import { Context } from "aws-lambda";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";

import { SessionItem } from "../../../lib/src/types/common-types";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { DynamoUnmarshallHandler } from "../src/dynamo-unmarshall-handler";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

describe("submit-answer-handler", () => {
  let mockMetricsProbe = jest.mocked(MetricsProbe).prototype;

  let dynamoUnmarshallHandler: DynamoUnmarshallHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
    jest.spyOn(mockMetricsProbe, "captureMetric");

    dynamoUnmarshallHandler = new DynamoUnmarshallHandler(mockMetricsProbe);
  });

  const marshalledSessionItem = {
    expiryDate: {
      N: "1234",
    },
    clientIpAddress: {
      S: "127.0.0.1",
    },
    redirectUri: {
      S: "http://localhost:8085/callback",
    },
    clientSessionId: {
      S: "97821f72-48b9-4f97-9532-b190affc5b8a",
    },
    createdDate: {
      N: "1727698707397",
    },
    clientId: {
      S: "unit-test-clientid",
    },
    subject: {
      S: "urn:fdc:gov.uk:2022:d416511f-160e-403a-a8f7-e92c9b983ad2",
    },
    persistentSessionId: {
      S: "37181027-dfa7-4267-bd85-ea67288279e6",
    },
    attemptCount: {
      N: "0",
    },
    sessionId: {
      S: "3d9d00c5-52ed-44c5-9890-07eea3a266cf",
    },
    state: {
      S: "kDe0EoxF-BjAR66B_Wzz_V48y0B4-fDpRM8eWCC6wao",
    },
  };

  const mockSessionItem: SessionItem = {
    expiryDate: 1234,
    clientIpAddress: "127.0.0.1",
    redirectUri: "http://localhost:8085/callback",
    clientSessionId: "97821f72-48b9-4f97-9532-b190affc5b8a",
    createdDate: 1727698707397,
    clientId: "unit-test-clientid",
    subject: "urn:fdc:gov.uk:2022:d416511f-160e-403a-a8f7-e92c9b983ad2",
    persistentSessionId: "37181027-dfa7-4267-bd85-ea67288279e6",
    attemptCount: 0,
    sessionId: "3d9d00c5-52ed-44c5-9890-07eea3a266cf",
    state: "kDe0EoxF-BjAR66B_Wzz_V48y0B4-fDpRM8eWCC6wao",
  };

  const mockInputEvent = {
    statemachine: { executionId: "test" } as Statemachine,
    marshalledPayload: marshalledSessionItem,
  };

  describe("happy path scenarios", () => {
    it("should return an unmarshalled SessionItem", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        mockInputEvent,
        {} as Context
      );
      expect(result).toEqual(mockSessionItem);

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    });

    it("should return an unmarshalled custom Item", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        {
          sessionItem: mockSessionItem,
          statemachine: { executionId: "test" } as Statemachine,
          marshalledPayload: {
            SType: { S: "Test" },
            NType: { N: 1234 },
            BOOLType: { BOOL: true },
          },
        },
        {} as Context
      );
      expect(result).toEqual({ SType: "Test", NType: 1234, BOOLType: true });

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    });

    it("should return an error on failure to unmarshall", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        {
          sessionItem: mockSessionItem,
          statemachine: { executionId: "test" } as Statemachine,
          marshalledPayload: {
            Key: { UNIT_TEST_TYPE: "Test" },
          },
        },
        {} as Context
      );
      expect(result).toEqual({
        error:
          "DynamoUnmarshallHandler : Unsupported type passed: UNIT_TEST_TYPE",
      });

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });

    it("should return an error on no input event", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        undefined,
        {} as Context
      );
      expect(result).toEqual({
        error: "DynamoUnmarshallHandler : input event is empty",
      });

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });

    it("should return an error on no input event", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        {
          sessionItem: mockSessionItem,
          statemachine: { executionId: "test" } as Statemachine,
        },
        {} as Context
      );
      expect(result).toEqual({
        error: "DynamoUnmarshallHandler : Marshalled payload not found",
      });

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });

    it("should return an error on no statemachine in input event", async () => {
      global.fetch = jest.fn();

      const result = await dynamoUnmarshallHandler.handler(
        {
          sessionItem: mockSessionItem,
          marshalledPayload: {
            SType: { S: "Test" },
            NType: { N: 1234 },
            BOOLType: { BOOL: true },
          },
        },
        {} as Context
      );
      expect(result).toEqual({
        error: "DynamoUnmarshallHandler : Statemachine values not found",
      });

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.ERROR
      );
    });
  });
});
