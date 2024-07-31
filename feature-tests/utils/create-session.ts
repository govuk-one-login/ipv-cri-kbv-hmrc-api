import EndPoints from "../apiEndpoints/endpoints";
import request from "supertest";
import { App } from "supertest/types";
import { jwtPartsEnum } from "../utils/utility";

let getClaimsUrl: any;
let postClaimsUrl: any;
let postSessionEndpoint: any;
let postAccessTokenEndpoint: any;
let getReqAuthCode: any;
let getTokenRequest: any;
let postHmrcKbvVCEndpoint: any;

const ENCODING = "base64";
const DECODING = "utf8";
const getJWTPayload = (jwt: string): string =>
  getJWTPart(jwt, jwtPartsEnum.PAYLOAD);
const decode = (returnedVcData: string): string =>
  Buffer.from(returnedVcData, ENCODING).toString(DECODING);

export async function generateClaimsUrl(selectedNino: string) {
  console.log("Generating Initial Claimset");
  const rowNumber = "&rowNumber=197";
  const ninoValue = "&nino=" + selectedNino;
  const claimsForUserUrl =
    EndPoints.PATH_GET_CLAIMS + EndPoints.CRI_ID + rowNumber + ninoValue;
  getClaimsUrl = await request(EndPoints.CORE_STUB_URL)
    .get(claimsForUserUrl)
    .set(
      "Authorization",
      getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      )
    )
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");
  console.log(
    "Initial ClaimSet: " + JSON.stringify(getClaimsUrl.text, undefined, 2)
  );
  console.log(
    "Generate Initial Claimset Status Code: ",
    getClaimsUrl.statusCode
  );
  expect(getClaimsUrl.statusCode).toEqual(Number(200));
}

export async function postUpdatedClaimsUrl() {
  console.log("Sending Claimset payload to CoreStub");
  const claimSetBody = getClaimsUrl.text;
  postClaimsUrl = await request(EndPoints.CORE_STUB_URL)
    .post(EndPoints.PATH_POST_CLAIMS + EndPoints.CRI_ID)
    .send(claimSetBody)
    .set(
      "Authorization",
      getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      )
    )
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");
  console.log(
    "Encoded ClaimSet Response Body: " +
      JSON.stringify(postClaimsUrl.body, undefined, 2)
  );
  console.log(
    "Create Session Request for ClaimSet Status Code: ",
    postClaimsUrl.statusCode
  );
  expect(postClaimsUrl.statusCode).toEqual(Number(200));
}

export async function postRequestToSessionEndpoint() {
  console.log("Sending Encoded Claimset to Session Endpoint");
  postSessionEndpoint = await request(
    EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
  )
    .post(EndPoints.SESSION_URL)
    .send(postClaimsUrl.text)
    .set("Content-Type", "application/json")
    .set("Accept", "application/json")
    .set("X-Forwarded-For", "123456789");
  console.log(
    "Request to SessionId endpoint Status Code:",
    postSessionEndpoint.statusCode
  );
  console.log(
    `Request to SessionId endpoint ${EndPoints.PRIVATE_API_GATEWAY_URL}${EndPoints.SESSION_URL} Response Body = ` +
      JSON.stringify(postSessionEndpoint.body, undefined, 2)
  );
  console.log("SESSION_ID = ", postSessionEndpoint.body.session_id);

  expect(postSessionEndpoint.statusCode).toEqual(Number(201));
}

export async function getRequestAuthorisationCode() {
  console.log("Generating Authorisation Code");
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
    .set("session-id", sessionId)
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");
  console.log("AUTH CODE: ", getReqAuthCode.body.authorizationCode.value);
  console.log(
    "Request to Authorisation Code endpoint Status Code:",
    getReqAuthCode.statusCode
  );
  expect(getReqAuthCode.statusCode).toEqual(Number(200));
}

export async function getAccessTokenRequest() {
  console.log("Generating Access Token Request");
  const authCode = getReqAuthCode.body.authorizationCode.value;
  const accessTokenUrl =
    EndPoints.PATH_POST_ACCESS_TOKEN +
    authCode +
    EndPoints.CRI_VALUE +
    EndPoints.CRI_ID;
  getTokenRequest = await request(EndPoints.CORE_STUB_URL)
    .get(accessTokenUrl)
    .set(
      "Authorization",
      getBasicAuthenticationHeader(
        process.env.CORE_STUB_USERNAME,
        process.env.CORE_STUB_PASSWORD
      )
    )
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");
  console.log(
    "Generate Access Token Status Code: ",
    getTokenRequest.statusCode
  );
  console.log(
    "Request to Access Token Endpoint Response Body: " +
      JSON.stringify(getTokenRequest.text, undefined, 2)
  );
}

export async function postRequestToAccessTokenEndpoint() {
  console.log("Post to Access Token Endpoint");
  postAccessTokenEndpoint = await request(EndPoints.PUBLIC_API_GATEWAY_URL)
    .post(EndPoints.PATH_ACCESS_TOKEN)
    .send(getTokenRequest.text)
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");
  console.log(
    "Post request to access token endpoint Status Code: ",
    postAccessTokenEndpoint.statusCode
  );
  console.log("ACCESS TOKEN: ", postAccessTokenEndpoint.body.access_token);
  // expect(postAccessTokenEndpoint.statusCode).toEqual(Number(201));
}

export async function postRequestHmrcKbvCriVc() {
  console.log("Requesting Encrypted HMRC KBV Verifiable Credential");
  const bearerToken = postAccessTokenEndpoint.body.access_token;
  postHmrcKbvVCEndpoint = await request(EndPoints.PUBLIC_API_GATEWAY_URL)
    .post(EndPoints.PATH_CREDENTIAL_ISSUE)
    .send({})
    .set("Authorization", "Bearer" + " " + bearerToken)
    .set("Content-Type", "application/json")
    .set("Accept", "application/json")
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
  console.log("Returned Encrypted VC: ", postHmrcKbvVCEndpoint.body);
  const vc = JSON.parse(decode(getJWTPayload(returnedVcData)));
  console.log("Returned Decrypted VC: ", vc);
}

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

export function getSessionId() {
  return postSessionEndpoint.body.session_id;
}

export function getBasicAuthenticationHeader(
  username: string | undefined,
  password: string | undefined
) {
  return "Basic " + btoa(username + ":" + password);
}
