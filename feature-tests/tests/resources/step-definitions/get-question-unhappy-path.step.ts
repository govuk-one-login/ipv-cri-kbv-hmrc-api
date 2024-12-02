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
  "./tests/resources/features/hmrcGet/hmrcQuestion-UnhappyPath.feature"
);

defineFeature(feature, (test) => {
  let getRequestToQuestionEndpoint: any;
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: string;

  beforeEach(async () => {});

  test("Unhappy Path - Get request to /question Endpoint - Invalid header Values - sessionId", ({
    given,
    then,
    when,
  }) => {
    given(
      /^I send a new questions request to the core stub with a nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    when(
      /^I send a new questions POST request with (.*) and (.*) to the fetchQuestions endpoint$/,
      async (contentType: string, accept: string) => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set({
            "Content-Type": contentType,
            Accept: accept,
            "session-id": getValidSessionId,
          })
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
    when(
      /^I send a GET request to the question endpoint with a invalid sessionId (.*)$/,
      async (session_id: string) => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set({
            "Content-Type": "application/json",
            Accept: "application/json",
            "session-id": session_id,
          })
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
          "Question Endpoint Invalid Headers - SessionId= ",
          JSON.stringify(getRequestToQuestionEndpoint.request, undefined, 2)
        );
        console.log(
          "GET Request Questions Endpoint - Status Code= ",
          getRequestToQuestionEndpoint.statusCode
        );
      }
    );

    then(
      /^I should receive the appropriate response with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(getRequestToQuestionEndpoint.body).toBeTruthy();
      }
    );
  });

  test("Unhappy Path - Get request to /question Endpoint - Invalid Header Values - contentType and accept", ({
    given,
    then,
    when,
    and,
  }) => {
    given(
      /^I send a valid questions request to the core stub with nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    and(/^I send a POST request to the fetchQuestions endpoint$/, async () => {
      postRequestToHmrcKbvEndpoint = await request(
        EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
      )
        .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
        .send({})
        .set({
          "Content-Type": "application/json",
          Accept: "application/json",
          "session-id": getValidSessionId,
        })
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
    });

    when(
      /^I send a GET request to the question endpoint with a invalid (.*) and (.*)$/,
      async (contentType: string, accept: string) => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.QUESTION_ENDPOINT)
          .set({
            "Content-Type": contentType,
            Accept: accept,
            "session-id": getValidSessionId,
          })
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
          "Question Endpoint Invalid Headers - Headers= ",
          JSON.stringify(getRequestToQuestionEndpoint, undefined, 2)
        );
        console.log(
          "GET Request Questions Endpoint - Status Code= ",
          getRequestToQuestionEndpoint.statusCode
        );
      }
    );

    then(
      /^I should receive the appropriate response for the invalid headers with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(getRequestToQuestionEndpoint.body).toBeTruthy();
      }
    );
  });

  test("Unhappy Path - Get request to /question Endpoint - Invalid Endpoint", ({
    given,
    then,
    when,
  }) => {
    given(
      /^I send a valid questions request to the core stub with selected nino value (.*) for user (.*)$/,
      async (selectedNino, userId) => {
        await generateClaimsUrl(selectedNino, userId);
        await postUpdatedClaimsUrl(false);
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );

    when(
      /^I send a GET request to a Invalid question endpoint with a valid (.*) and (.*)$/,
      async (contentType: string, accept: string) => {
        getRequestToQuestionEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .get(EndPoints.INVALID_QUESTION_ENDPOINT)
          .set({
            "Content-Type": contentType,
            Accept: accept,
            "session-id": getValidSessionId,
          })
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
          "Question Endpoint Invalid Headers - Headers= ",
          JSON.stringify(getRequestToQuestionEndpoint, undefined, 2)
        );
        console.log(
          "GET Request Questions Endpoint - Status Code= ",
          getRequestToQuestionEndpoint.statusCode
        );
      }
    );

    then(
      /^I should receive the appropriate response for the invalid endpoint with statusCode (.*)$/,
      async (statusCode: string) => {
        expect(getRequestToQuestionEndpoint.statusCode).toEqual(
          Number(statusCode)
        );
        expect(getRequestToQuestionEndpoint.body).toBeTruthy();
      }
    );
  });
});
