import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { generateClaimsUrl, postUpdatedClaimsUrl, postRequestToSessionEndpoint } from '../../../utils/create-session';
import EndPoints from '../../../apiEndpoints/endpoints';



const feature = loadFeature(
  "./tests/resources/features/authorizationGet/authorizationGet-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postSessionRequest: any;
  let generateValidClaimUrl: any;
  let postValidClaimUrl: any;
  // let claims = generateClaimsUrl;

beforeEach(async () => {
  await timeDelayForTestEnvironment(3500);
  });



test('Happy Path - Get Request to Authorization Endpoint for redirect_uri', ({
    given,
    when,
    then,
  }) => {
    given(/^I have obtained a valid user claim from the CoreStub$/, async () => {
        generateValidClaimUrl = await generateClaimsUrl();
        postValidClaimUrl = await postUpdatedClaimsUrl();
        postSessionRequest = await postRequestToSessionEndpoint();
      },
    );
    

    // when(/^I send a Get request to the Authorization endpoint with headers (.*) and (.*)$/, async (contentType: string, accept: string) => {
    //   async (contentType: string, accept: string) => {
    //     getAuthorizationToken = await request(claims)
    //       .get(getAuthorizationToken)
    //       .set('Authorization', EndPoints.CORE_STUB_USERNAME + ':' + EndPoints.CORE_STUB_PASSWORD)
    //       .set('Content-Type', contentType)
    //       .set('Accept', accept);
    //     console.log('GET Request Body URL = ' + generateClaimsUrl);
    //     console.log('GET Response Body = ' + JSON.stringify(getAuthorizationToken, undefined, 2));
    //     // console.log('GET Response Body = ' + JSON.stringify(getClaimsUrlforUser, undefined, 2));
    //   };
    // });

    // then(
    //   /^I should receive a response with (.*) and valid sessionId$/,
    //   async (statusCode: string) => {
    //     // expect(getAuthorizationToken.statusCode).toBe(Number(statusCode));
    //     getAuthorizationToken.body();
    //     // expect(getAuthorizationToken.body.vcs).toEqual(sessionId);
    //   },
    // );
  });
});