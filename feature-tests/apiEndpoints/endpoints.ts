export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL =
    process.env.TEST_ENVIRONMENT === "dev"
      ? `https://${process.env.API_GATEWAY_ID_PRIVATE}.execute-api.eu-west-2.amazonaws.com/${process.env.TEST_ENVIRONMENT}`
      : `https://${process.env.CFN_PrivateApiGatewayId}`;
  static readonly AUTHORIZATION_URL = "/oauth2/authorize";
  static readonly CORE_STUB_URL = `${process.env.CORE_STUB_URL}`;
  static readonly FETCH_QUESTIONS_ENDPOINT = "/fetchquestions";
  static readonly QUESTION_ENDPOINT = "/question";
  static readonly ANSWER_ENDPOINT = "/answer";
  static readonly SESSION_URL = "/session";
  static readonly CRI_ID = "hmrc-kbv-cri-dev";
  static readonly PATH_GET_CLAIMS = "/backend/generateInitialClaimsSet?cri=";
  static readonly PATH_POST_CLAIMS = "/backend/createSessionRequest?cri=";
}
