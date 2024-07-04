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

const kmsClient = jest.mocked(KMSClient).prototype;
const jwtSignerHandler = new JwtSignerHandler(kmsClient);
const mockGovJourneyId = "test-government-journey-id";

jest.spyOn(kmsClient, "send");

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

      const signedJwt = await jwtSignerHandler.handler(event);

      const { payload } = await jwtVerify(
        signedJwt,
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

      const signedJwt = await jwtSignerHandler.handler(event);

      const { payload } = await jwtVerify(
        signedJwt,
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

    await expect(jwtSignerHandler.handler(event)).rejects.toThrow(
      "KMS signing error: Error: KMS response does not contain a valid Signature."
    );
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

    await expect(
      jwtSignerHandler.handler(event as SignerPayLoad)
    ).rejects.toThrow(
      "KMS signing error: Error: ValidationException: 1 validation error detected: Value null at 'keyId' failed to satisfy constraint: Member must not be null"
    );
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

    await expect(
      jwtSignerHandler.handler(event as SignerPayLoad)
    ).rejects.toThrow(
      "KMS response is not in JSON format. SyntaxError: Unknown error"
    );
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

    await expect(
      jwtSignerHandler.handler(event as SignerPayLoad)
    ).rejects.toThrow(
      "An unknown error occurred while signing with KMS: [object Object]"
    );
  });
});
