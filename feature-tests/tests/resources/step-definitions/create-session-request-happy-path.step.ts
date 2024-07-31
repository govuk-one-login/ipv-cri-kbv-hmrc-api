import { defineFeature, loadFeature } from "jest-cucumber";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
} from "../../../utils/create-session";

const feature = loadFeature(
  "./tests/resources/features/createSession/createSessionRequest-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getValidSessionId: any;

  beforeEach(async () => {});

  test("Happy Path - Request for user claimSet from CoreStub for Valid User", ({
    given,
  }) => {
    given(
      /^I send a new core stub request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
  });
});
