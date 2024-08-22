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
  "./tests/resources/features/hmrcPost/hmrcFetchQuestions-UnhappyPath.feature"
);

defineFeature(feature, (test) => {
  let postRequestToHmrcKbvEndpoint: any;
  let getValidSessionId: any;

  beforeEach(async () => {});

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values - sessionId", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a valid fetchquestions request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to the fetchQuestions endpoint with a invalid sessionId (.*)$/,
      async (contentType: string, accept: string, session_id: string) => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.FETCH_QUESTIONS_ENDPOINT)
          .send({})
          .set("Content-Type", contentType)
          .set("Accept", accept)
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
        ("");
        console.log(
          "Fetch Question Invalid Headers - Session ID= ",
          JSON.stringify(postRequestToHmrcKbvEndpoint, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response and statusCode (.*) from the fetchquestions endpoint when using invalid sessionId$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Header Values - contentType and accept", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new valid fetchquestions request to the core stub with nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with invalid headers (.*) and (.*) to the fetchQuestions endpoint$/,
      async (contentType: string, accept: string) => {
        try {
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
              console.log(
                "parse logging",
                JSON.stringify(postRequestToHmrcKbvEndpoint, undefined, 2)
              );
              console.log(
                "parse logging status",
                postRequestToHmrcKbvEndpoint.statusCode
              );
              let data = Buffer.from("");
              res.on("data", function (chunk) {
                data = Buffer.concat([data, chunk]);
              });
              res.on("end", function () {
                cb(null, data.toString());
              });
            });
          console.log(
            "Fetch Question Endpoint Invalid Headers - Headers= ",
            JSON.stringify(postRequestToHmrcKbvEndpoint.request, undefined, 2)
          );
          console.log(
            "Fetch Question Endpoint Invalid Headers - Headers= ",
            JSON.stringify(postRequestToHmrcKbvEndpoint, undefined, 2)
          );
        } catch (err: any) {
          console.log("THIS ERROR" + JSON.stringify(err)),
            console.log("STATUS CODE" + JSON.stringify(err.status));
        }
      }
    );

    then(
      /^I should receive the appropriate response and statusCode (.*) from the fetchquestions endpoint when using invalid headers$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Endpoint", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new valid fetchquestions request to the core stub with the selected nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with valid headers (.*) and (.*) to a Invalid fetchQuestions endpoint$/,
      async (contentType: string, accept: string) => {
        postRequestToHmrcKbvEndpoint = await request(
          EndPoints.PRIVATE_API_GATEWAY_URL as unknown as App
        )
          .post(EndPoints.INVALID_FETCH_QUESTIONS_ENDPOINT)
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
          "Fetch Question Endpoint Invalid Headers - Headers= ",
          JSON.stringify(postRequestToHmrcKbvEndpoint.request, undefined, 2)
        );
        console.log(
          "Fetch Question Endpoint Invalid Headers - Headers= ",
          JSON.stringify(postRequestToHmrcKbvEndpoint, undefined, 2)
        );
      }
    );

    then(
      /^I should receive the appropriate response and statusCode (.*) from the fetchquestions endpoint when using invalid endpoint$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Invalid Nino <selectedNino>", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new fetchquestions request to the core stub with Invalid nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to the fetchQuestions endpoint with the invalid Nino$/,
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
      /^I should receive a valid response and statusCode (.*) from the fetchquestions endpoint for the invalid Nino$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Single Category Nino <selectedNino>", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new fetchquestions request to the core stub with a nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to the fetchQuestions endpoint with the selected Nino$/,
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
      /^I should receive a valid response and statusCode (.*) from the fetchquestions endpoint for a Nino with only 1 question Category$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - No Questions Nino <selectedNino>", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new fetchquestions request to the core stub with a no questions nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to fetchQuestions endpoint with the selected Nino$/,
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
      /^I should receive a valid response and statusCode (.*) from the fetchquestions endpoint for a Nino with no questions$/,
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

  test("Unhappy Path - Post Request to /fetchquestions Endpoint - Low Confidence Question Nino <selectedNino>", ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a new fetchquestions request to the core stub with a low confidence nino value (.*)$/,
      async (selectedNino) => {
        await generateClaimsUrl(selectedNino);
        await postUpdatedClaimsUrl();
        await postRequestToSessionEndpoint();
        getValidSessionId = getSessionId();
      }
    );
    when(
      /^I send a POST request with (.*) and (.*) to fetchQuestions endpoint with a Nino containing a low confidence question$/,
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
      /^I should receive a valid response and statusCode (.*) from the fetchquestions endpoint for a Nino a low confidence question$/,
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
