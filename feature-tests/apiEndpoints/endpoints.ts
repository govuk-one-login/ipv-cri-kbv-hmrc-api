export default class EndPoints {
    // public static BASE_URL1 =
    //   process.env.TEST_ENVIRONMENT === 'dev'
    //     ? `https://${process.env.SAM_STACK_NAME}.credential-store.${process.env.TEST_ENVIRONMENT}.account.gov.uk`
    //     : process.env.CFN_PrivateApiEndpoint;
    public static TOKEN_GENERATOR_PATH = '/generate';
    public static BASE_URL = 'http://localhost:8080/individuals/verification/';
    public static QUESTION_HMRC = 'identity-verification-questions/questions'
    public static ANSWER_HMRC = '/answer'
  }
  