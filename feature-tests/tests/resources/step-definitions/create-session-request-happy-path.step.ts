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
  beforeEach(async () => {});

  test("Happy Path - Request for user claimSet from CoreStub for Valid User", ({
    given,
    then,
  }) => {
    given(
      /^I send a GET request to the CoreStub for a Valid UserId$/,
      async () => {
        await generateClaimsUrl();
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
      }
    );

    then(
      /^I should receive a response with statusCode and user claimSet$/,
      async () => {}
    );
  });
});
