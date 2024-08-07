export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL = `${process.env.PRIVATE_API_GATEWAY}`;
  static readonly PUBLIC_API_GATEWAY_URL = `${process.env.PUBLIC_API_GATEWAY}`;
  static readonly AUTHORIZATION_URL = "/oauth2/authorize";
  static readonly CORE_STUB_URL = `${process.env.CORE_STUB_URL}`;
  static readonly FRONTEND = `${process.env.FRONTEND}`;
  static readonly FETCH_QUESTIONS_ENDPOINT = "/fetchquestions";
  static readonly QUESTION_ENDPOINT = "/question";
  static readonly ANSWER_ENDPOINT = "/answer";
  static readonly SESSION_URL = "/session";
  static readonly CRI_ID = "hmrc-kbv-cri-dev";
  static readonly CRI_VALUE = "&cri=";
  static readonly PATH_GET_CLAIMS = "/backend/generateInitialClaimsSet?cri=";
  static readonly PATH_POST_CLAIMS = "/backend/createSessionRequest?cri=";
  static readonly PATH_POST_ACCESS_TOKEN =
    "/backend/createTokenRequestPrivateKeyJWT?authorization_code=";
  static readonly PATH_GET_AUTH_TOKEN = "/authorization?redirect_uri=";
  static readonly PATH_CALLBACK_STATE = "/callback&state=";
  static readonly PATH_CLIENT_ID =
    "&scope=openid&response_type=code&client_id=";
  static readonly PATH_CREDENTIAL_ISSUE = "/credential/issue";
  static readonly PATH_ACCESS_TOKEN = "/token";
}
