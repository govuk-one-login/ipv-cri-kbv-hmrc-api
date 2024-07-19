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
  "./tests/resources/features/hmrcGet/hmrcQuestion-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;

  beforeEach(async () => {});

  test("Happy Path - Get request to /question Endpoint for userId", ({
    given,
    then,
    when,
  }) => {
    given(
      /^I send a new questions request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    when(
      /^I send a questions POST request with (.*) and (.*) to the fetchQuestions endpoint$/,
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
    when(/^I send a GET request to the question endpoint$/, async () => {
      getRequestToQuestionEndpoint = await request(
        EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
      )
        .get(EndPoints.QUESTION_ENDPOINT)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .set("session-id", getValidSessionId);
      console.log(
        "POST Request to HMRC KBV Status Code= ",
        getRequestToQuestionEndpoint.statusCode
      );
      console.log(
        "POST Request to HMRC KBV = " +
          JSON.stringify(getRequestToQuestionEndpoint, undefined, 2)
      );
    });

    then(
      /^I should receive a valid response with statusCode (.*) from the questions endpoint$/,
      async (statusCode: string) => {
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(getRequestToQuestionEndpoint.body).toBeTruthy();
      }
    );
  });
});
