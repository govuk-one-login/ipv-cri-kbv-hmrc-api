import { defineFeature, loadFeature } from "jest-cucumber";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
  updateClaimsUrl,
} from "../../../utils/create-session";

const feature = loadFeature(
  "./tests/resources/features/createSession/createSessionRequest-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getValidSessionId: any;

  beforeEach(async () => {});

  test("Happy Path - Request for user claimSet from CoreStub for Valid User with Nino <selectedNino>", ({
    given,
  }) => {
    given(
      /^I send a new core stub request to the core stub with nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
  });
});
