import { KMSClient } from "@aws-sdk/client-kms";
import { JwtSignerHandler } from "../src/jwt-signer-handler";
import sigFormatter from "ecdsa-sig-formatter";
import { SignerPayLoad } from "../src/signer-payload";
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

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

const mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
const kmsClient = jest.mocked(KMSClient).prototype;
const jwtSignerHandler: JwtSignerHandler = new JwtSignerHandler(
  mockMetricsProbe,
  kmsClient
);
const mockGovJourneyId = "test-government-journey-id";

jest.spyOn(kmsClient, "send");

const mockInputContext = {
  invokedFunctionArn: "test",
};

describe("Successfully signs a JWT", () => {
  const event: SignerPayLoad = {
    kid,
    header: JSON.stringify(header),
    claimsSet: JSON.stringify(claimsSet),
    govJourneyId: mockGovJourneyId,
  };
  describe("With RAW signing mode", () => {
    it("Should verify a signed JWT message smaller than 4096", async () => {
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
    });
  });

  describe("Using DIGEST signing mode", () => {
    it("Should verify a large signed JWT with claimset greater than 4096", async () => {
      const event: SignerPayLoad = {
        kid,
        header: JSON.stringify(header),
        claimsSet: JSON.stringify(largeClaimsSet),
        govJourneyId: mockGovJourneyId,
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
    });
  });
});

describe("Fails to sign a JWT", () => {
  it("Should error when signature is undefined", async () => {
    const event: SignerPayLoad = {
      kid,
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
      govJourneyId: mockGovJourneyId,
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.resolve({
        Signature: undefined,
      })
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event as SignerPayLoad,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS signing error: Error: KMS response does not contain a valid Signature.";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  it("Should fail when key ID is missing", async () => {
    const event: Partial<SignerPayLoad> = {
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
      govJourneyId: mockGovJourneyId,
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.reject(
        new Error(
          "ValidationException: 1 validation error detected: Value null at 'keyId' failed to satisfy constraint: Member must not be null"
        )
      )
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event as SignerPayLoad,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS signing error: Error: ValidationException: 1 validation error detected: Value null at 'keyId' failed to satisfy constraint: Member must not be null";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  it("Should throw an error if KMS response is not in JSON format", async () => {
    const event: Partial<SignerPayLoad> = {
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
      govJourneyId: mockGovJourneyId,
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.reject(new SyntaxError("Unknown error"))
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event as SignerPayLoad,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "KMS response is not in JSON format. SyntaxError: Unknown error";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);
  });

  it("Should throw an error for an unknown error during signing with KMS", async () => {
    const event: Partial<SignerPayLoad> = {
      header: JSON.stringify(header),
      claimsSet: JSON.stringify(claimsSet),
      govJourneyId: mockGovJourneyId,
    };

    kmsClient.send.mockImplementationOnce(() =>
      Promise.reject({ Signature: "invalid-response" })
    );

    const lambdaResponse = await jwtSignerHandler.handler(
      event as SignerPayLoad,
      mockInputContext
    );

    const lambdaName = JwtSignerHandler.name;
    const errorText: string =
      "An unknown error occurred while signing with KMS: [object Object]";
    const errorMessage = `${lambdaName} : ${errorText}`;
    const expectedResponse = { error: errorMessage };

    expect(lambdaResponse).toEqual(expectedResponse);
  });
});
