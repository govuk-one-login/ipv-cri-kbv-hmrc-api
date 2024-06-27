import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';
import { SESSION_REQUEST_BODY } from '../../../utils/session_request_body_data';
import { Buffer } from 'node:buffer';

const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostSession-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToSessionEndpoint: any;
  // let sessionRequestBody: any;
  // let getSessionJwtAsJson: any;



beforeEach(async () => {
  await timeDelayForTestEnvironment(3500);
  });

// async function userIdentityAsJwtStringForUpdatedUser(
//   criId: string,
//   updatedJsonString: string,
// ): Promise<void> {



// }
const username = 'user'
const password = 'bBme2AQ6tdYmP25'

function getformJWT() {
  const payload = Buffer.from(JSON.stringify(username + ':' + password)).toString('base64url');
  return `${payload}`;
}

async function createRequest(user: keyof typeof SESSION_REQUEST_BODY) {
  console.log(`Initiating set up: creating request containing ${user}`);
  await timeDelayForTestEnvironment(3500);
  const response = await request(EndPoints.PRIVATE_API_ENDPOINT + '/backend/createSessionRequest?cri=') 
    .post(EndPoints.CRI_ID)
    .send(JSON.stringify(user))
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    // .set('Authorization', getformJWT)
    console.log('response from post request: ' + response.statusCode);
    console.log(JSON.stringify(response));
}


test('Happy Path - Post Request to Session Endpoint', ({
    given,
    when,
  }) => {
    given(/^I send a Valid POST request for (.*) to the session endpoint with (.*) and (.*) and (.*)$/, async (user: keyof typeof SESSION_REQUEST_BODY, contentType, accept, xForwardedFor) => {
    // console.log('sending happy path post request for simple test, with user id ' + testUserId);
    await timeDelayForTestEnvironment(3000);
  
    postRequestToSessionEndpoint = await request(EndPoints.PRIVATE_API_ENDPOINT)
      .post(EndPoints.SESSION_URL)
      //JWT encoded JSON Blob
      .send(JSON.stringify(createRequest))
      .set('Accept', accept)
      .set('X-Forwarded-For', xForwardedFor)
      .set('Content-Type', contentType);
    console.log('response from post request: ' + postRequestToSessionEndpoint.statusCode);
    console.log(JSON.stringify(postRequestToSessionEndpoint, undefined, 2));
  });

  when(
    /^I should receive a response with (.*) and valid sessionId$/,
    async (statusCode) => {
      expect(postRequestToSessionEndpoint.statusCode).toEqual(Number(statusCode));
      console.log(JSON.stringify(postRequestToSessionEndpoint.body))
    });
  });
});
