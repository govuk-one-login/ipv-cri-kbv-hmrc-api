import { KMSClient } from "@aws-sdk/client-kms";
import { JwtSignerHandler } from "../src/jwt-signer-handler";
import sigFormatter from "ecdsa-sig-formatter";
import { importJWK, jwtVerify } from "jose";
import {
  claimsSet,
  header,
  joseLargeClaimsSetSignature,
  joseSignature,
  kid,
  largeClaimsSet,
  publicVerifyingJwk,
} from "./test-data";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { SessionItem } from "../../../lib/src/types/common-types";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

const mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
const kmsClient = jest.mocked(KMSClient).prototype;
const jwtSignerHandler: JwtSignerHandler = new JwtSignerHandler(
  mockMetricsProbe,
  kmsClient
);

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

const mockInputContext = {
  invokedFunctionArn: "test",
};

jest.spyOn(kmsClient, "send");

describe("Successfully signs a JWT", () => {
  describe("With RAW signing mode", () => {
    it("Should verify a signed JWT message smaller than 4096", async () => {
      const event = {
        sessionItem: testSessionItem,
        statemachine: testStateMachineValue,
        kid: kid,
        header: JSON.stringify(header),
        claimsSet: JSON.stringify(claimsSet),
      };

      kmsClient.send.mockImplementationOnce(() =>
        Promise.resolve({
          Signature: sigFormatter.joseToDer(joseSignature, "ES256"),
        })
      );

      const signedJwt = (await jwtSignerHandler.handler(
        event,
        mockInputContext
      )) as { jwt: string };

      const { payload } = await jwtVerify(
        signedJwt.jwt,
        await importJWK(publicVerifyingJwk, "ES256"),
        {
          algorithms: ["ES256"],
        }
      );

      expect(signedJwt).toBeDefined();

      expect(kmsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MessageType: "RAW",
          }),
        })
      );

      expect(payload).toStrictEqual(JSON.parse(event.claimsSet));

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    });
  });

  describe("Using DIGEST signing mode", () => {
    it("Should verify a large signed JWT with claimset greater than 4096", async () => {
      const event = {
        sessionItem: testSessionItem,
        statemachine: testStateMachineValue,
        kid: kid,
        header: JSON.stringify(header),
        claimsSet: JSON.stringify(largeClaimsSet),
      };
      kmsClient.send.mockImplementationOnce(() =>
        Promise.resolve({
          Signature: sigFormatter.joseToDer(
            joseLargeClaimsSetSignature,
            "ES256"
          ),
        })
      );

      const signedJwt = (await jwtSignerHandler.handler(
        event,
        mockInputContext
      )) as { jwt: string };

      const { payload } = await jwtVerify(
        signedJwt.jwt,
        await importJWK(publicVerifyingJwk, "ES256"),
        {
          algorithms: ["ES256"],
        }
      );

      expect(signedJwt).toBeDefined();

      expect(kmsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MessageType: "DIGEST",
          }),
        })
      );

      expect(payload).toStrictEqual(JSON.parse(event.claimsSet));

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    });
  });
});

describe("Fails to sign a JWT", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should error when signature is undefined", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      kid: kid,
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.resolve({
        Signature: undefined,
      })
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS signing error: Error: KMS response does not contain a valid Signature.";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("Should fail when key ID is missing", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
    };

    const lambdaResponse = await jwtSignerHandler.handler(
      event,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string = "kid not found";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("Should throw an error if KMS response is not in JSON format", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      kid: kid,
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.reject(new SyntaxError("Not JSON"))
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS response is not in JSON format. SyntaxError Not JSON";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("Should throw an error for an unknown error during signing with KMS", async () => {
    const event = {
      sessionItem: testSessionItem,
      statemachine: testStateMachineValue,
      kid: kid,
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.reject(new SyntaxError("Unknown error"))
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS response is not in JSON format. SyntaxError Unknown error";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });
});
