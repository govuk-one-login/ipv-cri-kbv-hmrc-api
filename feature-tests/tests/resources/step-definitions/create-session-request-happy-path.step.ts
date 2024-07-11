import { defineFeature, loadFeature } from "jest-cucumber";
import {
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
} from "../../../utils/create-session";

const feature = loadFeature(
  "./tests/resources/features/createSession/createSessionRequest-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postSessionRequest: any;
  let generateValidClaimUrl: any;
  let postValidClaimUrl: any;

  beforeEach(async () => {
    // await timeDelayForTestEnvironment(3500);
  });

  test("Happy Path - Request for user claimSet from CoreStub for Valid User", ({
    given,
    then,
  }) => {
    given(
      /^I send a GET request to the CoreStub for a Valid UserId$/,
      async () => {
        generateValidClaimUrl = await generateClaimsUrl();
        postValidClaimUrl = await postUpdatedClaimsUrl();
        postSessionRequest = await postRequestToSessionEndpoint();
      }
    );

    then(
      /^I should receive a response with statusCode and user claimSet$/,
      async () => {
      }
    );
  });
});
