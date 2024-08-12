import {
  getClaimsUrl,
  postUpdatedClaimsUrl,
  postRequestToSessionEndpoint,
  postRequestToHmrcKbvEndpoint,
  getRequestToQuestionEndpoint,
  postRequestToAnswerEndpoint,
  getRequestAuthorisationCode,
  getTokenRequestPrivateKeyJWT,
  postAccessTokenRequest,
  postRequestHmrcKbvCriVc,
  validateJwtToken,
} from "./ApiTestSteps";
import { GetClaimsUrlResponse } from "./types";

describe("HMRC KBV Happy Path", () => {
  let clientId: string;
  let getClaimsResponse: GetClaimsUrlResponse;
  let state: string;
  let sessionId: string;

  it.each([
    "KE000000C",
    "AA000000A",
    "AA000003A",
    "AA000004A",
    "AA000005A",
    "AA000006A",
  ])(
    "Successful Request Test for $selectedNino - VC Generation for User with 3 HMRC KBV Questions",
    async (selectedNino: string) => {
      // Generate Shared Claims URL Response
      const generateClaimsUrlResponse = await getClaimsUrl(selectedNino);
      getClaimsResponse = generateClaimsUrlResponse.data;
      // Post Updates Claims URL Response
      const postUpdatedClaimsUrlResponse = await postUpdatedClaimsUrl(
        generateClaimsUrlResponse.data
      );
      clientId = postUpdatedClaimsUrlResponse.data.client_id;
      // Start HMRC KBV Session
      const sessionResponse = await postRequestToSessionEndpoint(
        postUpdatedClaimsUrlResponse.data
      );
      state = sessionResponse.data.state;
      sessionId = sessionResponse.data.session_id;
      console.log("SessionId: " + sessionId);
      // Fetch HRMC KBV Questions
      await postRequestToHmrcKbvEndpoint(sessionId);
      // Answer Question 1
      const getQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );
      await postRequestToAnswerEndpoint(
        getQuestionResponse.data.questionKey,
        sessionId
      );
      // Answer Question 2
      const getSecondQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );
      await postRequestToAnswerEndpoint(
        getSecondQuestionResponse.data.questionKey,
        sessionId
      );
      // Answer Question 3
      const getThirdQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );
      await postRequestToAnswerEndpoint(
        getThirdQuestionResponse.data.questionKey,
        sessionId
      );
      // Validate no more questions requested
      await getRequestToQuestionEndpoint(sessionId, 204);
      // Get Authorization Code
      const authResponse = await getRequestAuthorisationCode(
        state,
        clientId,
        sessionId
      );
      // Get Token Private Key JWT
      const tokenResponse = await getTokenRequestPrivateKeyJWT(
        authResponse.data.authorizationCode.value,
        sessionId
      );
      // Get Access Token
      const accessTokenResp = await postAccessTokenRequest(tokenResponse.data);
      // Get Verifiable Credential JWT and check for verificationScore of 2
      const verifiableCredentialResponse = await postRequestHmrcKbvCriVc(
        accessTokenResp.data.access_token
      );
      await validateJwtToken(
        verifiableCredentialResponse.data,
        getClaimsResponse,
        2
      );
    }
  );

  it.each(["AA000002C"])(
    "Successful Request Test for $selectedNino - VC Generation for User with 2 HMRC KBV Questions",
    async (selectedNino: string) => {
      // Generate Shared Claims URL Response
      const generateClaimsUrlResponse = await getClaimsUrl(selectedNino);
      getClaimsResponse = generateClaimsUrlResponse.data;
      // Post Updates Claims URL Response
      const postUpdatedClaimsUrlResponse = await postUpdatedClaimsUrl(
        generateClaimsUrlResponse.data
      );
      clientId = postUpdatedClaimsUrlResponse.data.client_id;
      // Start HMRC KBV Session
      const sessionResponse = await postRequestToSessionEndpoint(
        postUpdatedClaimsUrlResponse.data
      );
      state = sessionResponse.data.state;
      sessionId = sessionResponse.data.session_id;
      // Fetch HRMC KBV Questions
      await postRequestToHmrcKbvEndpoint(sessionId);
      // Answer Question 1
      const getQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );
      await postRequestToAnswerEndpoint(
        getQuestionResponse.data.questionKey,
        sessionId
      );
      // Answer Question 2
      const getSecondQuestionResponse = await getRequestToQuestionEndpoint(
        sessionId,
        200
      );
      await postRequestToAnswerEndpoint(
        getSecondQuestionResponse.data.questionKey,
        sessionId
      );
      // Validate no more questions requested
      await getRequestToQuestionEndpoint(sessionId, 204);
      // Get Authorization Code
      const authResponse = await getRequestAuthorisationCode(
        state,
        clientId,
        sessionId
      );
      // Get Token Private Key JWT
      const tokenResponse = await getTokenRequestPrivateKeyJWT(
        authResponse.data.authorizationCode.value,
        sessionId
      );
      // Get Access Token
      const accessTokenResp = await postAccessTokenRequest(tokenResponse.data);
      // Get Verifiable Credential JWT and check for verificationScore of 0
      const verifiableCredentialResponse = await postRequestHmrcKbvCriVc(
        accessTokenResp.data.access_token
      );
      await validateJwtToken(
        verifiableCredentialResponse.data,
        getClaimsResponse,
        0
      );
    }
  );
});
