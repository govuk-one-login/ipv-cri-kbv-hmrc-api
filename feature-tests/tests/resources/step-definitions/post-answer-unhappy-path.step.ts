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
import { questionKeyResponse } from "../../../utils/answer_body";
import { findObjectContainingValue } from "../../../utils/utility";

const feature = loadFeature(
  "./tests/resources/features/hmrcPost/hmrcAnswer-UnhappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToAnswerEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;
  let questionKeyFromGetResponse: string;

  beforeEach(async () => {});

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - sessionId", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a request to the core stub with nino value (.*)$/,
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
        console.log(
          "HMRC KBV fetchquestions endpoint Status Code =",
          postRequestToHmrcKbvEndpoint.statusCode
        );
      }
    );
    when(/^I send a valid GET request to the question endpoint$/, async () => {
      getRequestToQuestionEndpoint = await request(
        EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
      )
        .get(EndPoints.QUESTION_ENDPOINT)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .set("session-id", getValidSessionId);
      console.log(
        "GET Request Question Endpoint - QuestionKey Response = " +
          JSON.stringify(
            getRequestToQuestionEndpoint.body.questionKey,
            undefined,
            2
          )
      );
      questionKeyFromGetResponse =
        await getRequestToQuestionEndpoint.body.questionKey;
    });

    and(
      /^I send a POST request to the question endpoint with a invalid sessionId (.*)$/,
      async (session_id: string) => {
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProperty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProperty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", session_id)
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
        console.log("ReturnedAnswer = ", postPayload);
      }
    );

    then(
      /^I should receive the appropriate response for the invalid header value with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "Final statusCode from Questions Endpoint = " +
            postRequestToAnswerEndpoint.statusCode
        );
      }
    );
  });

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Header Values", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a valid request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    and(
      /^I send a POST request to the question endpoint with invalid (.*) and (.*)$/,
      async (contentType: string, accept: string) => {
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send("")
          .set("Content-Type", contentType)
          .set("Accept", accept)
          .set("session-id", getValidSessionId);
      }
    );

    then(
      /^I should receive the appropriate response for the invalid headers value with statusCode (.*) and (.*)$/,
      async (statusCode: string, responseMessage: any) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(postRequestToAnswerEndpoint.body.message).toContain(
          responseMessage
        );
        console.log(
          "Answer Endpoint statuscode: " +
            postRequestToAnswerEndpoint.statusCode
        );
        console.log(
          "Response from Answer Endpoint using invalid headers: " +
            JSON.stringify(postRequestToAnswerEndpoint.text, undefined, 2)
        );
      }
    );
  });
});
