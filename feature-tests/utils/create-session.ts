import EndPoints from "../apiEndpoints/endpoints";
import request from "supertest";
import { App } from "supertest/types";
import { getJWTPayload, getJwtSignature, decode } from "../utils/jwt-utils";

let getClaimsUrl: any;
let postClaimsUrl: any;
let postSessionEndpoint: any;
let postAccessTokenEndpoint: any;
let getReqAuthCode: any;
let getTokenRequest: any;
let postHmrcKbvVCEndpoint: any;
let updatedClaimSet: any;

export async function generateClaimsUrl(selectedNino: string, userId: string) {
  const rowNumber = userId;
  const ninoValue = "&nino=" + selectedNino;
  const claimsForUserUrl =
    EndPoints.PATH_GET_CLAIMS +
    EndPoints.CRI_ID +
    "&rowNumber=" +
    rowNumber +
    ninoValue;
  getClaimsUrl = await request(EndPoints.CORE_STUB_URL)
    .get(claimsForUserUrl)
    .set({
      Authorization: getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      ),
      "Content-Type": "application/json",
      Accept: "application/json",
    });
  console.log(
    "Initial ClaimSet Generated: " +
      JSON.stringify(getClaimsUrl.text, undefined, 2)
  );
  expect(getClaimsUrl.statusCode).toEqual(Number(200));
}

export async function updateClaimsUrl(firstName: string, familyName: string) {
  const originalClaimSet = getClaimsUrl.text;
  const newClaimSet = JSON.parse(originalClaimSet);

  const updatedGivenName = firstName;
  const updatedFamilyName = familyName;

  newClaimSet.shared_claims.name[0].nameParts.forEach(
    (part: { type: string; value: string }) => {
      if (part.type === "GivenName") {
        part.value = updatedGivenName;
      } else if (part.type === "FamilyName") {
        part.value = updatedFamilyName;
      }
    }
  );
  updatedClaimSet = newClaimSet;
  console.log(
    "Updated Claimset Body: ",
    JSON.stringify(updatedClaimSet.shared_claims.name, undefined, 2)
  );
}

export async function postUpdatedClaimsUrl(useUpdatedBody: boolean) {
  const claimSetBody = getClaimsUrl.text;
  const claimSetBodyNew = updatedClaimSet;

  const bodyToSend = useUpdatedBody ? claimSetBodyNew : claimSetBody;

  postClaimsUrl = await request(EndPoints.CORE_STUB_URL)
    .post(EndPoints.PATH_POST_CLAIMS + EndPoints.CRI_ID)
    .send(bodyToSend)
    .set({
      Authorization: getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      ),
      "Content-Type": "application/json",
      Accept: "application/json",
    });
  console.log(
    "Encoded ClaimSet Response Body: " +
      JSON.stringify(postClaimsUrl.body, undefined, 2)
  );
  expect(postClaimsUrl.statusCode).toEqual(Number(200));
  return postClaimsUrl.body;
}

export async function postRequestToSessionEndpoint() {
  postSessionEndpoint = await request(
    EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
  )
    .post(EndPoints.SESSION_URL)
    .send(postClaimsUrl.text)
    .set({
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Forwarded-For": "123456789",
    });
  console.log("SESSION_ID = ", postSessionEndpoint.body.session_id);
  expect(postSessionEndpoint.statusCode).toEqual(Number(201));
}

export async function getRequestAuthorisationCode() {
  const state = postSessionEndpoint.body.state;
  const clientId = postClaimsUrl.body.client_id;
  const sessionId = postSessionEndpoint.body.session_id;
  const authCodeUrl =
    EndPoints.PATH_GET_AUTH_TOKEN +
    EndPoints.CORE_STUB_URL +
    EndPoints.PATH_CALLBACK_STATE +
    state +
    EndPoints.PATH_CLIENT_ID +
    clientId;
  getReqAuthCode = await request(EndPoints.PRIVATE_API_GATEWAY_URL)
    .get(authCodeUrl)
    .set({
      "Content-Type": "application/json",
      Accept: "application/json",
      "session-id": sessionId,
    });
  console.log("SESSION ID: ", sessionId);
  console.log("AUTH CODE: ", getReqAuthCode.body.authorizationCode.value);
  expect(getReqAuthCode.statusCode).toEqual(Number(200));
}

export async function getAccessTokenRequest() {
  const authCode = getReqAuthCode.body.authorizationCode.value;
  const accessTokenUrl =
    EndPoints.PATH_POST_ACCESS_TOKEN +
    authCode +
    EndPoints.CRI_VALUE +
    EndPoints.CRI_ID;
  getTokenRequest = await request(EndPoints.CORE_STUB_URL)
    .get(accessTokenUrl)
    .set({
      Authorization: getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      ),
      "Content-Type": "application/json",
      Accept: "application/json",
    });
  console.log(
    "Request to Access Token Endpoint Response Body: " +
      JSON.stringify(getTokenRequest.text, undefined, 2)
  );
}

export async function postRequestToAccessTokenEndpoint() {
  postAccessTokenEndpoint = await request(EndPoints.PUBLIC_API_GATEWAY_URL)
    .post(EndPoints.PATH_ACCESS_TOKEN)
    .send(getTokenRequest.text)
    .set({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
  console.log("ACCESS TOKEN: ", postAccessTokenEndpoint.body.access_token);
  expect(postAccessTokenEndpoint.statusCode).toEqual(Number(200));
}

export async function postRequestHmrcKbvCriVc() {
  console.log("Requesting HMRC KBV Verifiable Credential:");
  const bearerToken = postAccessTokenEndpoint.body.access_token;
  postHmrcKbvVCEndpoint = await request(EndPoints.PUBLIC_API_GATEWAY_URL)
    .post(EndPoints.PATH_CREDENTIAL_ISSUE)
    .send({})
    .set({
      Authorization: "Bearer" + " " + bearerToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    })
    .buffer(true)
    .parse((res, cb) => {
      let data = Buffer.from("");
      res.on("data", function (chunk) {
        data = Buffer.concat([data, chunk]);
      });
      res.on("end", function () {
        cb(null, data.toString());
      });
    });
  expect(postHmrcKbvVCEndpoint.statusCode).toEqual(Number(200));
  const returnedVcData = postHmrcKbvVCEndpoint.body;
  console.log("Raw VC Response", returnedVcData);
  console.log("HTTP Headers", postHmrcKbvVCEndpoint.headers);
  const vc = decode(getJWTPayload(returnedVcData));
  const signature = getJwtSignature(returnedVcData);
  expect(postHmrcKbvVCEndpoint.headers).toHaveProperty(
    "content-type",
    "application/jwt"
  );
  console.log("VC Body: ", vc + " VC Signature: ", signature);
  return vc;
}

export function getSessionId() {
  return postSessionEndpoint.body.session_id;
}

export function getBasicAuthenticationHeader(
  username: string | undefined,
  password: string | undefined
) {
  return "Basic " + btoa(username + ":" + password);
}
