import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';


const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostQuestions-HappyPath.feature"
);

defineFeature(feature, (test) => {

// beforeEach(async () => {
//   });

test('Happy Path - Post Request to HMRC KBV Questions Endpoint', ({
    given,
    then,
  }) => {
    given(/^I send a Valid POST request to the questions endpoint$/, async () => {
    // console.log('sending happy path post request for simple test, with user id ' + testUserId);
    await timeDelayForTestEnvironment(3000);
    // vcsPOSTResponse = await request(EndPoints.BASE_URL)
    //   .post(EndPoints.PATH_VCS + testUserId)
    //   .send(JSON.stringify(getArrayOfValidVcTokens(numberOfVCsToPersist)))
    //   .set('Accept', accept)
    //   .set('x-api-key', apiKey)
    //   .set('Authorization', 'Bearer' + ' ' + authorizationToken)
    //   .set('Content-Type', contentType);
    // console.log('response from post request: ' + vcsPOSTResponse.statusCode);
    // console.log(JSON.stringify(vcsPOSTResponse, undefined, 2));
    });

    then(
      /^I should receive a response with (.*)$/,
      async () => {
        await timeDelayForTestEnvironment(3000);
        const events = ['userActionIdResetSuccess', 'userActionPswResetSuccess'];
        // if (!events.includes(aisEventType)) {
        //   const receivedMessage = await filterUserIdInMessages(testUserId);
        //   const body = receivedMessage[0].Body;
        //   const extensions = body ? attemptParseJSON(body).extensions : {};
        //   expect(extensions.allowable_interventions).toEqual(aisEventResponse[aisEventType].allowable_interventions);
        // }
      },
    );
  });
});