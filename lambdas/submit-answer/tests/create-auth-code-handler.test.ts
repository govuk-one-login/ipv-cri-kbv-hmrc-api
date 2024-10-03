import { Context } from "aws-lambda";
import { CreateAuthCodeHandler } from "../src/create-auth-code-handler";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { SessionItem } from "../../../lib/src/types/common-types";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

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

describe("create-auth-code-handler", () => {
  let mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
  let createAuthCodeHandler: CreateAuthCodeHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset due to test changing this
    testSessionItem.clientId = "unit-test-clientid";

    mockMetricsProbe = jest.mocked(MetricsProbe).prototype;

    jest.spyOn(mockMetricsProbe, "captureMetric");

    createAuthCodeHandler = new CreateAuthCodeHandler(mockMetricsProbe);
  });

  it("should return an expiry 10 minutes after Date.now()", async () => {
    const mayThirtyOne2021 = 1622502000000;
    jest.spyOn(Date, "now").mockReturnValue(mayThirtyOne2021);

    const result = await createAuthCodeHandler.handler(
      {
        sessionItem: testSessionItem,
        statemachine: testStateMachineValue,
      } as unknown,
      {} as Context
    );
    const mayThirtyOne2021Plus10MinsInSeconds = 1622502600;

    expect(result).toEqual({
      authCodeExpiry: mayThirtyOne2021Plus10MinsInSeconds,
    });

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.OK
    );
  });
});
