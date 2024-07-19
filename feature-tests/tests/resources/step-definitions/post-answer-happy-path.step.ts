import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import EndPoints from "../../../apiEndpoints/endpoints";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
} from "../../../utils/create-session";
import {
  ANSWER_POST_PAYLOAD,
  ANSWER_POST_PAYLOAD_1,
  ANSWER_POST_PAYLOAD_2,
} from "../../../utils/answer_body";
import { App } from "supertest/types";

const feature = loadFeature(
  "./tests/resources/features/hmrcPost/hmrcAnswer-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToAnswerEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;

  beforeEach(async () => {});

  test("Happy Path - Post request to /answer Endpoint for userId", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a new answer request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a valid POST request with (.*) and (.*) to the fetchQuestions endpoint$/,
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
        expect(postRequestToHmrcKbvEndpoint.statusCode).toEqual(Number(200));
        console.log(
          "HMRC KBV fetchquestions endpoint Status Code= ",
          postRequestToHmrcKbvEndpoint.statusCode
        );
      }
    );
    when(
      /^I send a GET request to the question endpoint followed by a POST request to the answer endpoint$/,
      async () => {
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
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(ANSWER_POST_PAYLOAD)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "POST Request to HMRC KBV Status Code= ",
          postRequestToAnswerEndpoint.statusCode
        );
        console.log(
          "POST Request to HMRC KBV = " +
            JSON.stringify(postRequestToAnswerEndpoint, undefined, 2)
        );
      }
    );

    and(
      /^I send a second GET request to the question endpoint followed by a POST request to the answer endpoint$/,
      async () => {
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
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(ANSWER_POST_PAYLOAD_1)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "POST Request to HMRC KBV Status Code= ",
          postRequestToAnswerEndpoint.statusCode
        );
        console.log(
          "POST Request to HMRC KBV = " +
            JSON.stringify(postRequestToAnswerEndpoint, undefined, 2)
        );
      }
    );

    and(
      /^I send a third GET request to the question endpoint followed by a POST request to the answer endpoint$/,
      async () => {
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
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(ANSWER_POST_PAYLOAD_2)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "POST Request to HMRC KBV Status Code= ",
          postRequestToAnswerEndpoint.statusCode
        );
        console.log(
          "POST Request to HMRC KBV = " +
            JSON.stringify(postRequestToAnswerEndpoint, undefined, 2)
        );
      }
    );

    then(
      /^I should receive a valid response with statusCode (.*) from the answers endpoint$/,
      async (statusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(postRequestToAnswerEndpoint.body).toBeTruthy();
      }
    );

    then(
      /^I should receive a final valid response with statusCode (.*) from the questions endpoint$/,
      async (finalStatusCode: string) => {
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
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(finalStatusCode)
        );
      }
    );
  });
});
