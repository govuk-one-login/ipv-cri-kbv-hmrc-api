export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL = `https://${process.env.API_GATEWAY_ID_PUBLIC}.execute-api.eu-west-2.amazonaws.com/${process.env.TEST_ENVIRONMENT}`;
  static readonly AUTHORIZATION_URL = "/oauth2/authorize";
  static readonly BASE_URL = "http://localhost:8085";
  static readonly FETCH_QUESTIONS_ENDPOINT = "/fetchquestions";
  static readonly QUESTION_ENDPOINT = "/question";
  static readonly ANSWER_ENDPOINT = "/answer";
  static readonly SESSION_URL = "/session";
  static readonly CRI_ID = "hmrc-kbv-cri-dev";
  static readonly PATH_GET_CLAIMS = "/backend/generateInitialClaimsSet?cri=";
  static readonly PATH_POST_CLAIMS = "/backend/createSessionRequest?cri=";
}
