import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import { generateClaimsUrl, postUpdatedClaimsUrl, postRequestToSessionEndpoint, getSessionId } from '../../../utils/create-session';
import EndPoints from '../../../apiEndpoints/endpoints';



const feature = loadFeature(
  "./tests/resources/features/authorizationGet/authorizationGet-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postSessionRequest: any;
  let generateValidClaimUrl: any;
  let postValidClaimUrl: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;
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
    
    when(/^I send a POST request to the fetchQuestions endpoint$/, async () => {
        getValidSessionId = getSessionId();
        postRequestToHmrcKbvEndpoint = await request(EndPoints.PRIVATE_API_GATEWAY_URL)
        .post(EndPoints.FETCH_QUESTIONS)
        .send("")
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('session_id', getValidSessionId);
    console.log('POST Request to HMRC KBV Status Code= ' , postRequestToHmrcKbvEndpoint.statusCode)
    console.log('POST Request to HMRC KBV = ' + JSON.stringify(postRequestToHmrcKbvEndpoint, undefined, 2));
    // expect(postRequestToHmrcKbvEndpoint.statusCode).toEqual(Number(201));
    });

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