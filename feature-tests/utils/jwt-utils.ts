import { DECODING, ENCODING, jwtPartsEnum } from "../utils/constants";
import logger from "../utils/logger";

/**
 * A function for extracting and returning the signature of a JWT.
 * @param jwt - the JWT from which to extract the signature
 * @returns the JWT signature
 * @throws TypeError when the JWT is invalid or the value of the JWT signature is falsy
 */
export const getJwtSignature = (jwt: string): string =>
  getJWTPart(jwt, jwtPartsEnum.SIGNATURE);

/**
 * A function for extracting and returning the payload of a JWT.
 * @param jwt - the JWT from which to extract the payload
 * @returns the JWT payload string
 * @throws TypeError when the JWT is invalid or the value of the JWT payload is falsy
 */
export const getJWTPayload = (jwt: string): string =>
  getJWTPart(jwt, jwtPartsEnum.PAYLOAD);

/**
 * A function for extracting and returning the header of a JWT.
 *
 * @param jwt - the JWT from which to extract the header
 * @returns the JWT header string
 * @throws TypeError when the JWT is invalid or the value of the JWT header is falsy
 */
export const getJWTHeader = (jwt: string): string =>
  getJWTPart(jwt, jwtPartsEnum.HEADER);

/**
 * Helper function to decode string from Base64 encoding to UTF-8.
 * @param base64EncodedString - the Base64 encoded string that requires decoding.
 * @returns the decoded string as UTF-8
 */
export const decode = (base64EncodedString: string): string =>
  Buffer.from(base64EncodedString, ENCODING).toString(DECODING);

/**
 * Helper function to decode and return the JWT payload as JSON object.
 *
 * **N.B.** This method swallows any parse errors.
 * @param jwt - the JWT to extract the payload from.
 * @returns The payload decoded as JSON or `undefined` if it fails to parse.
 */
export function decodeAndReturnPayload(jwt: string) {
  try {
    return JSON.parse(decode(getJWTPayload(jwt)));
  } catch {
    logger.warn("Unable to get JWT payload object.");
  }
}

/**
 * Helper function to decode and return the JWT header as JSON object.
 *
 * **N.B.** This method swallows any parse errors.
 * @param jwt - the JWT to extract the header from.
 * @returns The header decoded as JSON or `undefined` if it fails to parse.
 */
export function decodeAndReturnHeader(jwt: string) {
  try {
    return JSON.parse(decode(getJWTHeader(jwt)));
  } catch {
    logger.warn("Unable to get JWT header object.");
  }
}

/**
 * A function for extracting and returning a part of a JWT.
 * @param jwt - a JWT from which to extract the part.
 * @param part - the JWT part to return {@link jwtPartsEnum}
 * @returns a JWT part as a string only. Header and Payload still need to be parsed to JSON.
 * @throws TypeError if JWT is invalid or missing parts.
 */
function getJWTPart(jwt: string, part: jwtPartsEnum): string {
  const jwtParts = jwt.split(".");
  if (!jwtParts || jwtParts.length != 3) {
    throw new TypeError(
      `The JWT is invalid. Missing parts, unable to get ${jwtPartsEnum[part]}.`
    );
  }

  if (jwtParts[part]) {
    return jwtParts[part] as string;
  } else {
    throw new TypeError(
      `The JWT is invalid, ${jwtPartsEnum[part]} is missing.`
    );
  }
}
