export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL = `${process.env.PRIVATE_API_GATEWAY}`
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
