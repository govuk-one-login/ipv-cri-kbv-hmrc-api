import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import EndPoints from "../../../apiEndpoints/endpoints";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
} from "../../../utils/create-session";
import { App } from "supertest/types";

const feature = loadFeature(
  "./tests/resources/features/hmrcPost/hmrcFetchQuestions-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: any;

  beforeEach(async () => {});

  test("Happy Path - Post Request to /fetchquestions Endpoint for userId", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new fetchquestions request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to the fetchQuestions endpoint$/,
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

    then(
      /^I should receive a valid response and statusCode (.*) from the fetchquestions endpoint$/,
      async (statusCode: string) => {
        expect(postRequestToHmrcKbvEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "HMRC KBV fetchquestions endpoint Status Code= ",
          postRequestToHmrcKbvEndpoint.statusCode
        );
      }
    );
  });
});
