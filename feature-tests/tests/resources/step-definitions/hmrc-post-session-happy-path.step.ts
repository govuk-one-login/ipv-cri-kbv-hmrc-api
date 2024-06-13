import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';
import { SESSION_REQUEST_BODY } from '../../../utils/session_request_body_data';


const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostSession-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToSessionEndpoint: any;
  let sessionRequestBody: any;
  let getSessionJwtAsJson: any;



// beforeEach(async () => {
//   });

async function userIdentityAsJwtStringForUpdatedUser(
  criId: string,
  updatedJsonString: string,
): Promise<void> {



  // Capture client id for using later in the auth request
  const CLIENT_ID = ['client_id'];
  console.log(`CLIENT_ID = ${CLIENT_ID}`);
}


test('Happy Path - Post Request to Session Endpoint', ({
    given,
    then,
  }) => {
    given(/^I send a Valid POST request for (.*) to the session endpoint with (.*) and (.*) and (.*)$/, async (user: keyof typeof SESSION_REQUEST_BODY, contentType, accept, xForwardedFor) => {
    // console.log('sending happy path post request for simple test, with user id ' + testUserId);
    await timeDelayForTestEnvironment(3000);
  
    postRequestToSessionEndpoint = await request(EndPoints.PRIVATE_API_ENDPOINT)
      .post(EndPoints.SESSION_URL)
      .send(JSON.stringify(user))
      .set('Accept', accept)
      .set('X-Forwarded-For', xForwardedFor)
      .set('Content-Type', contentType);
    console.log('response from post request: ' + postRequestToSessionEndpoint.statusCode);
    console.log(JSON.stringify(postRequestToSessionEndpoint, undefined, 2));
  });

  then(
    /^I should receive a response with (.*) and valid sessionId$/,
    async () => {
      // expect(getAuthorizationToken.statusCode).toBe(Number(statusCode));
      postRequestToSessionEndpoint.body();
      // expect(getAuthorizationToken.body.vcs).toEqual(sessionId);
    });
  });
});
