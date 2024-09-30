import { LambdaInterface } from "@aws-lambda-powertools/commons/types";
import { createHash } from "crypto";
import sigFormatter from "ecdsa-sig-formatter";
import { fromEnv } from "@aws-sdk/credential-providers";
import { SignageType } from "./signage-type";
import { base64url } from "jose";
import {
  KMSClient,
  MessageType,
  SignCommand,
  SigningAlgorithmSpec,
} from "@aws-sdk/client-kms";

import {
  HandlerMetricExport,
  MetricsProbe,
} from "../../../lib/src/Service/metrics-probe";

import {
  HandlerMetric,
  CompletionStatus,
} from "../../../lib/src/MetricTypes/handler-metric-types";

import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { LogHelper } from "../../../lib/src/Logging/log-helper";
import { JwtSignerInputs } from "./jwt-signer-inputs";
import { SessionItem } from "../../../lib/src/types/common-types";
import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { SharedInputsValidator } from "../../../lib/src/util/shared-inputs-validator";

const logHelper = new LogHelper("JwtSignerHandler");

export class JwtSignerHandler implements LambdaInterface {
  constructor(
    private readonly metricsProbe: MetricsProbe,
    private readonly kmsClient: KMSClient
  ) {}

  @logHelper.logger.injectLambdaContext({ clearState: true })
  @HandlerMetricExport.logMetrics({
    throwOnEmptyMetrics: false,
    captureColdStartMetric: true,
  })
  public async handler(event: any, _context: unknown): Promise<object> {
    try {
      const input: JwtSignerInputs = this.safeRetrieveLambdaEventInputs(event);

      logHelper.setSessionItemToLogging(input.sessionItem);
      logHelper.setStatemachineValuesToLogging(input.statemachine);
      logHelper.info(
        `Handling request for session ${input.sessionItem.sessionId}`
      );

      logHelper.info("Base64 encodeding JWT header and body");
      const header = base64url.encode(input.header);
      const payload = base64url.encode(input.claimsSet);

      logHelper.info("Signing JWT with KMS");
      const response = await this.signWithKms(header, payload, input.kid);
      const signature = sigFormatter.derToJose(
        Buffer.from(response).toString("base64"),
        "ES256"
      );

      const encodedJWT: string = `${header}.${payload}.${signature}`;

      this.metricsProbe.captureMetric(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );

      logHelper.info("Returning JWT");
      return { jwt: encodedJWT };
    } catch (error: any) {
      const lambdaName = JwtSignerHandler.name;
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

  private async signWithKms(
    jwtHeader: string,
    jwtPayload: string,
    KeyId: string
  ): Promise<Uint8Array> {
    const payload = Buffer.from(`${jwtHeader}.${jwtPayload}`);

    const signage: SignageType = this.checkSize(payload)
      ? { message: this.hashInput(payload), type: MessageType.DIGEST }
      : { message: payload, type: MessageType.RAW };

    try {
      const signingResponse = await this.kmsClient.send(
        new SignCommand({
          KeyId,
          Message: signage.message,
          SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
          MessageType: signage.type,
        })
      );
      if (!signingResponse?.Signature) {
        throw new Error("KMS response does not contain a valid Signature.");
      }
      logHelper.info("JWT Signed");
      return signingResponse.Signature;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `KMS response is not in JSON format. ${error.name} ${error.message}`
        );
      } else if (error instanceof Error) {
        throw new Error(`KMS signing error: ${error}`);
      } else {
        throw new Error(
          `An unknown error occurred while signing with KMS: ${error}`
        );
      }
    }
  }

  private readonly hashInput = (input: Buffer): Uint8Array =>
    createHash("sha256").update(input).digest();

  private readonly checkSize = (message: Buffer): boolean =>
    message.length >= 4096;

  private safeRetrieveLambdaEventInputs(event: any): JwtSignerInputs {
    if (!event) {
      throw new Error("input event is empty");
    }

    const header = event.header;
    if (!header) {
      throw new Error("header not found");
    }

    const claimsSet = event.claimsSet;
    if (!claimsSet) {
      throw new Error("claimsSet not found");
    }

    const kid = event.kid;
    if (!kid) {
      throw new Error("kid not found");
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
      header: header,
      claimsSet: claimsSet,
      kid: kid,
    } as JwtSignerInputs;
  }
}

const metricProbe = new MetricsProbe();
const handlerClass = new JwtSignerHandler(
  metricProbe,
  new KMSClient({ region: "eu-west-2", credentials: fromEnv() })
);
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
