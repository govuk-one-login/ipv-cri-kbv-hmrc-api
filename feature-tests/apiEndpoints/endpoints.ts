export default class EndPoints {
  public static PRIVATE_API_GATEWAY_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://${process.env.SAM_STACK_NAME}.execute-api.eu-west-2.amazonaws.com/${process.env.TEST_ENVIRONMENT}`
      : process.env.CFN_PrivateApiGatewayId;
  public static AUTHORIZATION_URL = "/oauth2/authorize";
  public static BASE_URL = "http://localhost:8085";
  public static ANSWER_HMRC = "/answer";
  public static FETCH_QUESTIONS_ENDPOINT = "/fetchquestions";
  public static QUESTION_ENDPOINT = "/question";
  public static ANSWER_ENDPOINT = "/answer";
  public static CORE_STUB_URL = "http://cri-3rdparty.core.stubs.account.gov.uk";
  public static PRIVATE_GATEWAY_ID = "http://cri-3rdparty.core.stubs.account.gov.uk";
  public static SESSION_URL = "/session";
  public static CRI_ID = "hmrc-kbv-cri-dev";
  public static BASE_URL_GET_CLAIMS = "/backend/generateInitialClaimsSet?cri=";
  public static BASE_URL_POST_CLAIMS = "/backend/createSessionRequest?cri=";
}
