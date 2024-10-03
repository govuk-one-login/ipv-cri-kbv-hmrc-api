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
  "./tests/resources/features/hmrcPost/hmrcAnswer-UnhappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToAnswerEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;
  let questionKeyFromGetResponse: string;
  let decrypedVcResponse: any;

  beforeEach(async () => {});

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - sessionId", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a request to the core stub with nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
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
        console.log(
          "Answer Endpoint Invalid Headers - SessionId ",
          JSON.stringify(postRequestToAnswerEndpoint.request, undefined, 2)
        );
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

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - contentType and accept", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a valid request to the core stub with nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    and(
      /^I send a valid POST request to the fetchQuestions endpoint$/,
      async () => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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

    and(
      /^I send a new valid GET request to the question endpoint$/,
      async () => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "GET Request Questions Endpoint - Status Code= ",
          getRequestToQuestionEndpoint.statusCode
        );
        console.log(
          "GET Request Questions Endpoint - QuestionKey Response = " +
            JSON.stringify(
              getRequestToQuestionEndpoint.body.questionKey,
              undefined,
              2
            )
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
      }
    );

    when(
      /^I send a POST request to the answer endpoint with invalid (.*) and (.*)$/,
      async (contentType: string, accept: string) => {
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
          .set("Content-Type", contentType)
          .set("Accept", accept)
          .set("session-id", getValidSessionId);

        console.log("ReturnedAnswer = ", postPayload);
        console.log(
          "Response from Answer Endpoint using invalid headers: " +
            JSON.stringify(postRequestToAnswerEndpoint, undefined, 2)
        );
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

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Endpoint", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a valid request to the core stub with the selected nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    and(
      /^I send a valid new POST request to the fetchQuestions endpoint$/,
      async () => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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

    and(
      /^I send a valid new GET request to the question endpoint$/,
      async () => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .set("session-id", getValidSessionId);
        console.log(
          "GET Request Questions Endpoint - Status Code= ",
          getRequestToQuestionEndpoint.statusCode
        );
        console.log(
          "GET Request Questions Endpoint - QuestionKey Response = " +
            JSON.stringify(
              getRequestToQuestionEndpoint.body.questionKey,
              undefined,
              2
            )
        );
        questionKeyFromGetResponse =
          await getRequestToQuestionEndpoint.body.questionKey;
      }
    );

    when(
      /^I send a POST request to a Invalid answer endpoint with valid (.*) and (.*)$/,
      async (contentType: string, accept: string) => {
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.INVALID_ANSWER_ENDPOINT)
          .send("")
          .set("Content-Type", contentType)
          .set("Accept", accept)
          .set("session-id", getValidSessionId);
        console.log(
          "Answer Endpoint Invalid Endpoint: ",
          JSON.stringify(postRequestToAnswerEndpoint.request.url, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response for the invalid answer endpoint with statusCode (.*) and (.*)$/,
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

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Invalid Question Key", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a request to the core stub with a nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a new valid POST request to the fetchQuestions endpoint$/,
      async () => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
    when(
      /^I send a valid GET request to the question endpoint for a valid userId$/,
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
      }
    );

    and(
      /^I send a POST request to the question endpoint with a invalid questionKey body$/,
      async () => {
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(questionKeyResponse.ANSWER_POST_PAYLOAD_INVALID_QUESTION_KEY)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
          "Answer Endpoint Invalid Payload= ",
          JSON.stringify(postRequestToAnswerEndpoint.request, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response for the invalid post body with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "StatusCode from Questions Endpoint = " +
            postRequestToAnswerEndpoint.statusCode
        );
      }
    );
  });

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a new request to the core stub with a nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a new POST request to the fetchQuestions endpoint$/,
      async () => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
    when(
      /^I send a new valid GET request to the question endpoint for a valid userId$/,
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
      }
    );

    and(
      /^I send a POST request to the question endpoint with a incorrect questionKey body$/,
      async () => {
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(questionKeyResponse.ANSWER_POST_PAYLOAD_ITA_BANK)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
          "Answer Endpoint Invalid Payload= ",
          JSON.stringify(postRequestToAnswerEndpoint.request, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response for the incorrect post body with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "StatusCode from Questions Endpoint = " +
            postRequestToAnswerEndpoint.statusCode
        );
      }
    );
  });

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Answer Body - Incorrect Question Key Value", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a new valid request to the core stub with a nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a new POST request to the fetchQuestions endpoint for a valid userId$/,
      async () => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
    when(
      /^I send a new GET request to the question endpoint for a valid userId$/,
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
      }
    );

    and(
      /^I send a POST request to the question endpoint with a invalid questionKey (.*) value body$/,
      async (invalidQuestionKeyValue) => {
        postRequestToAnswerEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.ANSWER_ENDPOINT)
          .send(invalidQuestionKeyValue)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
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
          "Answer Endpoint Invalid Payload= ",
          JSON.stringify(postRequestToAnswerEndpoint.request, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response for the invalid value post body with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        console.log(
          "StatusCode from Questions Endpoint = " +
            postRequestToAnswerEndpoint.statusCode
        );
      }
    );
  });

  test("Unhappy Path - Post request to /answer Endpoint - Invalid Header Values - Malformed Response", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a answer request to the core stub with nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    given(
      /^I send a new valid POST request with (.*) and (.*) to the fetchQuestions endpoint with status code (.*)$/,
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
      /^I send the first GET request to the question endpoint followed by a POST request to the answer endpoint with the correct answerKey$/,
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
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
        );
      }
    );

    and(
      /^I send the second GET request to the question endpoint followed by a POST request to the answer endpoint$/,
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
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
        );
      }
    );
    and(
      /^I send the third GET request to the question endpoint followed by a POST request to the answer endpoint$/,
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

        console.log(
          JSON.stringify(
            `QUESTION_ENDPOINT statusCode ${getRequestToQuestionEndpoint.statusCode}`
          )
        );

        console.log(
          JSON.stringify(
            `questionKeyFromGetResponse ${questionKeyFromGetResponse}`
          )
        );

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
        console.log(
          "Answer Endpoint Status Response " +
            JSON.stringify(postRequestToAnswerEndpoint.status)
        );
      }
    );
    then(
      /^I should receive the valid response with statusCode (.*) from the answers endpoint$/,
      async (intermediateStatusCode: string) => {
        expect(postRequestToAnswerEndpoint.statusCode).toEqual(
          Number(intermediateStatusCode)
        );
        expect(postRequestToAnswerEndpoint.body).toBeTruthy();
        console.log(
          "Final statusCode from Answers Endpoint = " +
            postRequestToAnswerEndpoint.statusCode
        );
      }
    );
  });
});
