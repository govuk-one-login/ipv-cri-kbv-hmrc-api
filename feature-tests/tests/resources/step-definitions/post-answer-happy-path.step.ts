import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import EndPoints from "../../../apiEndpoints/endpoints";
import {
  getSessionId,
  generateClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
  getRequestAuthorisationCode,
  getAccessTokenRequest,
  postRequestToAccessTokenEndpoint,
  postRequestHmrcKbvCriVc,
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
  let decrypedVcResponse: any;

  beforeEach(async () => {});

  test("Happy Path - Post request to /answer Endpoint for nino <selectedNino> with >=3 questions over 2 questionKeys", ({
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
    when(
      /^I send a first GET request to the question endpoint followed by a POST request to the answer endpoint with the correct answerKey$/,
      async () => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "Question Endpoint Response = " +
            JSON.stringify(getRequestToQuestionEndpoint.body)
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
        console.log("Preparing answer Payload");
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];

        console.log(
          "Sending Answer : ",
          JSON.stringify(postQuestionKey),
          "To ",
          EndPoints.PRIVATE_API_GATEWAY_URL + EndPoints.ANSWER_ENDPOINT
        );
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
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
          "Question Endpoint Response = " +
            JSON.stringify(getRequestToQuestionEndpoint.body)
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
        console.log("Preparing answer Payload");
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];

        console.log(
          "Sending Answer : ",
          JSON.stringify(postQuestionKey),
          "To ",
          EndPoints.PRIVATE_API_GATEWAY_URL + EndPoints.ANSWER_ENDPOINT
        );
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
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
          "Question Endpoint Response = " +
            JSON.stringify(getRequestToQuestionEndpoint.body)
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
        console.log("Preparing answer Payload");
        const postPayload = await findObjectContainingValue(
          questionKeyResponse,
          questionKeyFromGetResponse
        );
        const objectProprty = Object.keys(postPayload!)[0];
        const postQuestionKey = postPayload![objectProprty];

        console.log(
          "Sending Answer : ",
          JSON.stringify(postQuestionKey),
          "To ",
          EndPoints.PRIVATE_API_GATEWAY_URL + EndPoints.ANSWER_ENDPOINT
        );
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(postQuestionKey)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
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
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(finalStatusCode)
        );
        console.log(
          "Final statusCode from Questions Endpoint = " +
            getRequestToQuestionEndpoint.statusCode
        );
      }
    );

    then(
      /^I should receive a VC with the correct values (.*) for (.*) with >=3 questions over 2 questionKey$/,
      async (selectedNino: string, verificationScore: any) => {
        await getRequestAuthorisationCode();
        await getAccessTokenRequest();
        await postRequestToAccessTokenEndpoint();
        decrypedVcResponse = await postRequestHmrcKbvCriVc();
        expect(decrypedVcResponse).toBeTruthy();
        expect(decrypedVcResponse).toContain(verificationScore);
        expect(decrypedVcResponse).toContain(selectedNino);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for nino <selectedNino> with 2 questions over 2 questionKeys", ({
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

    then(
      /^I should receive a VC with the correct values (.*) for (.*) with 2 questions over 2 question keys$/,
      async (selectedNino: string, verificationScore: any) => {
        await getRequestAuthorisationCode();
        await getAccessTokenRequest();
        await postRequestToAccessTokenEndpoint();
        decrypedVcResponse = await postRequestHmrcKbvCriVc();
        console.log("Full VC" + decrypedVcResponse);
        expect(decrypedVcResponse).toBeTruthy();
        expect(decrypedVcResponse).toContain(verificationScore);
        expect(decrypedVcResponse).toContain(selectedNino);
      }
    );
  });

  test("Happy Path - Post request to /answer Endpoint for nino <selectedNino> with 3 questions including 1 low confidence question", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a new request to the core stub with nino value (.*) for a user with 3 questions including 1 low confidence question$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a POST request with (.*) and (.*) to the fetchQuestions endpoint with status code (.*)$/,
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
      /^I send a GET request for a medium confidence question to the question endpoint followed by a POST request to the answer endpoint$/,
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
      /^I send a second GET request for a medium confidence question to the question endpoint followed by a final POST request to the answer endpoint$/,
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
      /^I should receive the final valid response with statusCode (.*) from the questions endpoint for a user with 2 medium confidence questions$/,
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

    then(
      /^I should receive a VC with the correct values (.*) for (.*) with 2 medium confidence questions over 2 question keys$/,
      async (selectedNino: string, verificationScore: any) => {
        await getRequestAuthorisationCode();
        await getAccessTokenRequest();
        await postRequestToAccessTokenEndpoint();
        decrypedVcResponse = await postRequestHmrcKbvCriVc();
        expect(decrypedVcResponse).toBeTruthy();
        expect(decrypedVcResponse).toContain(verificationScore);
        expect(decrypedVcResponse).toContain(selectedNino);
      }
    );
  });
});
