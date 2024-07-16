import { defineFeature, loadFeature } from "jest-cucumber";
import EndPoints from "../../../apiEndpoints/endpoints";
import request from "supertest";
import { timeDelayForTestEnvironment } from "../../../utils/utility";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
} from "../../../utils/create-session";
import { App } from "supertest/types";

const feature = loadFeature(
  "./tests/resources/features/createSession/createSessionRequest-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: any;
  let postSessionRequest: any;
  let generateValidClaimUrl: any;
  let postValidClaimUrl: any;

  beforeEach(async () => {
    generateValidClaimUrl = await generateClaimsUrl();
    postValidClaimUrl = await postUpdatedClaimsUrl();
    postSessionRequest = await postRequestToSessionEndpoint();
    getValidSessionId = getSessionId();
  });

  test("Happy Path - Request for user claimSet from CoreStub for Valid User", ({
    given,
    then,
  }) => {
    given(
      /^I send a new POST request with (.*) and (.*) to the fetchQuestions endpoint$/,
      async (contentType: string, accept: string) => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", contentType)
          .set("Accept", accept)
          .set("session-id", getValidSessionId)
          .buffer(true)
          .parse((res, cb) => {
            let data = Buffer.from("");
            res.on("data", function (chunk) {
              data = Buffer.concat([data, chunk]);
            });
            res.on("end", function () {
              cb(null, data.toString());
            });
          });
      }
    );

    then(/^I wait for the Lambda to warm up$/, async () => {
      await timeDelayForTestEnvironment(300);
    });
  });
});
