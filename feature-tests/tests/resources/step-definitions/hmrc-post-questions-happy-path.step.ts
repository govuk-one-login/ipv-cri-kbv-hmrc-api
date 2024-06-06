import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';

const feature = loadFeature(
  "./tests/resources/features/hmrcPOST/hmrcKbvPostQuestions-HappyPath.feature"
);

defineFeature(feature, (test) => {});

// beforeEach(async () => {
//   });

test('Happy Path - Post Request to HMRC KBV Questions Endpoint', ({
    given,
    then,
  }) => {
    given(/^I send a Valid POST request to the questions endpoint$/, async () => {
    //   await sendSQSEvent(testUserId, aisEventType);
    });

    then(
      /^I should receive a response with (.*)$/,
    //   async (aisEventType: keyof typeof aisEventResponse) => {
    //     const events = ['userActionIdResetSuccess', 'userActionPswResetSuccess'];
    //     if (!events.includes(aisEventType)) {
    //       const receivedMessage = await filterUserIdInMessages(testUserId);
    //       const body = receivedMessage[0].Body;
    //       const extensions = body ? attemptParseJSON(body).extensions : {};
    //       expect(extensions.allowable_interventions).toEqual(aisEventResponse[aisEventType].allowable_interventions);
    //     }
    //   },
    );
  });
