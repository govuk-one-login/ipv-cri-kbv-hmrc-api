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
  "./tests/resources/features/hmrcPost/hmrcAnswer-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToAnswerEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;
  let questionKeyFromGetResponse: string;

  beforeEach(async () => {});

  test("Happy Path - Post request to /answer Endpoint for userId with 3 questions over 2 questionKeys", ({
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
      /^I send a valid POST request with (.*) and (.*) to the fetchQuestions endpoint with status code (.*)$/,
      async (contentType: string, accept: string, statusCode: string) => {
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
        expect(postRequestToHmrcKbvEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "HMRC KBV fetchquestions endpoint Status Code =",
          postRequestToHmrcKbvEndpoint.statusCode
        );
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
      /^I send a POST request to the answer endpoint with the correct answerKey$/,
      async () => {
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log("ReturnedAnswer = ", postPayload);
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
          "GET Request Question Endpoint - QuestionKey Response = " +
            JSON.stringify(
              getRequestToQuestionEndpoint.body.questionKey,
              undefined,
              2
            )
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log("ReturnedAnswer = ", postPayload);
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
          "GET Request Question Endpoint - QuestionKey Response = " +
            JSON.stringify(
              getRequestToQuestionEndpoint.body.questionKey,
              undefined,
              2
            )
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log("ReturnedAnswer = ", postPayload);
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
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(finalStatusCode)
        );
        console.log(
          "Final statusCode from Questions Endpoint = " +
            getRequestToQuestionEndpoint.statusCode
        );
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for userId with 2 questions over 2 questionKeys", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a new request to the core stub with nino value (.*) for a user with 2 questions$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a valid 2 question POST request with (.*) and (.*) to the fetchQuestions endpoint with status code (.*)$/,
      async (contentType: string, accept: string, statusCode: string) => {
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
        expect(postRequestToHmrcKbvEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "HMRC KBV fetchquestions endpoint Status Code =",
          postRequestToHmrcKbvEndpoint.statusCode
        );
      }
    );
    when(
      /^I send the first GET request to the question endpoint followed by a POST request to the answer endpoint$/,
      async () => {
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
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log("ReturnedAnswer = ", postPayload);
      }
    );

    and(
      /^I send a second GET request to the question endpoint followed by a final POST request to the answer endpoint$/,
      async () => {
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
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log("ReturnedAnswer = ", postPayload);
      }
    );

    then(
      /^I should receive the final valid response with statusCode (.*) from the questions endpoint for a user with 2 questions answered correctly$/,
      async (finalStatusCode: string) => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(finalStatusCode)
        );
        console.log(
          "Final statusCode from Questions Endpoint = " +
            getRequestToQuestionEndpoint.statusCode
        );
      }
    );
  });
});
