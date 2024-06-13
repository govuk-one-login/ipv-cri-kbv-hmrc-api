import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';

const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostSession-HappyPath.feature"
);

defineFeature(feature, (test) => {
  // let getAuthorizationToken: any;
  let postRequestToSessionEndpoint: any;


// beforeEach(async () => {
//   });

const 

test('Happy Path - Post Request to Session Endpoint', ({
    given,
    then,
  }) => {
    given(/^I send a Valid POST request to the session endpoint with (.*) and (.*) and (.*)$/, async (contentType, accept, x-forwarded-for ) => {
    // console.log('sending happy path post request for simple test, with user id ' + testUserId);
    await timeDelayForTestEnvironment(3000);
    postRequestToSessionEndpoint = await request(EndPoints.PRIVATE_API_ENDPOINT)
      .post(EndPoints.SESSION_URL)
      .send(JSON.stringify(getArrayOfValidVcTokens(numberOfVCsToPersist)))
      .set('Accept', accept)
      .set('X-Forwarded-For', x-forwarded-for)
      .set('Authorization', 'Bearer' + ' ' + authorizationToken)
      .set('Content-Type', contentType);
    console.log('response from post request: ' + vcsPOSTResponse.statusCode);
    console.log(JSON.stringify(vcsPOSTResponse, undefined, 2));
    };
    });
});