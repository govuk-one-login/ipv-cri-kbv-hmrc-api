import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';


const feature = loadFeature(
  "./tests/resources/features/authorizationGet/authorizationGet-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getAuthorizationToken: any;
  let sessionId: string;

// beforeEach(async () => {
//   });

test('Happy Path - Get Request to Authorization Endpoint for sessionId', ({
    given,
    then,
  }) => {
    given(/^I send a Get request to the Authorization endpoint with headers (.*) and (.*)$/, async () => {
      async (contentType: string, accept: string) => {
        await timeDelayForTestEnvironment(4000);
        getAuthorizationToken = await request(EndPoints.AUTHORIZATION_URL)
          .get(EndPoints.AUTHORIZATION_URL + sessionId)
          // .set('Authorization', 'Bearer' + ' ' + authorizationToken)
          .set('Content-Type', contentType)
          .set('Accept', accept);
        console.log('GET Response Body = ' + JSON.stringify(getAuthorizationToken, undefined, 2));
      };
    });

    then(
      /^I should receive a response with (.*) and valid (.*)$/,
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