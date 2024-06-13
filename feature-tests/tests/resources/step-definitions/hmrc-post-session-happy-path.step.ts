import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';

const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostSession-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToSessionEndpoint: any;


// beforeEach(async () => {
//   });




test('Happy Path - Post Request to Session Endpoint', ({
    given,
    then,
  }) => {
    given(/^I send a Valid POST request to the session endpoint with (.*) and (.*) and (.*)$/, async (contentType, accept, xForwardedFor) => {
    // console.log('sending happy path post request for simple test, with user id ' + testUserId);
    await timeDelayForTestEnvironment(3000);
    postRequestToSessionEndpoint = await request(EndPoints.PRIVATE_API_ENDPOINT)
      .post(EndPoints.SESSION_URL)
      // .send(JSON.stringify(getArrayOfValidVcTokens(numberOfVCsToPersist)))
      .set('Accept', accept)
      .set('X-Forwarded-For', xForwardedFor)
      .set('Content-Type', contentType);
    console.log('response from post request: ' + postRequestToSessionEndpoint.statusCode);
    console.log(JSON.stringify(postRequestToSessionEndpoint, undefined, 2));
  });

  then(
    /^I should receive a response with (.*) and valid sessionId$/,
    async (statusCode: string) => {
      // expect(getAuthorizationToken.statusCode).toBe(Number(statusCode));
      postRequestToSessionEndpoint.body();
      // expect(getAuthorizationToken.body.vcs).toEqual(sessionId);
    },
  );
});
