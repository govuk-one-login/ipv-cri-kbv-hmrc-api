import { Buffer } from "node:buffer";
import EndPoints from "../apiEndpoints/endpoints";
import request from "supertest";
import { App } from "supertest/types";

let getClaimsUrl: any;
let postClaimsUrl: any;
let postSessionEndpoint: any;

export async function generateClaimsUrl() {
  console.log("Generating Initial Claimset");
  const rowNumber = "&rowNumber=197";
  const ninoValue = "&nino=AA0000002I";
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
    "Generate Initial Claimset Status Code  = ",
    getClaimsUrl.statusCode
  );
  console.log(
    "Initial ClaimSet Response Body = " +
      JSON.stringify(getClaimsUrl.text, undefined, 2)
  );
  expect(getClaimsUrl.statusCode).toEqual(Number(200));
}

export function getBasicAuthenticationHeader(
  username: string | undefined,
  password: string | undefined
) {
  return "Basic " + btoa(username + ":" + password);
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
    "Create Session Request for ClaimSet Status Code = ",
    postClaimsUrl.statusCode
  );
  console.log(
    "Create Session Request for Encoded ClaimSet Response Body = " +
      JSON.stringify(postClaimsUrl.body, undefined, 2)
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
    "Request to SessionId endpoint Status Code = ",
    postSessionEndpoint.statusCode
  );
  console.log(
    "Request to SessionId endpoint Response Body = " +
      JSON.stringify(postSessionEndpoint.body, undefined, 2)
  );
  console.log("SESSION_ID = ", postSessionEndpoint.body.session_id);
  expect(postSessionEndpoint.statusCode).toEqual(Number(201));
}

export function getSessionId() {
  return postSessionEndpoint.body.session_id;
}
