export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL = `${process.env.PRIVATE_API_GATEWAY}`;
  static readonly PUBLIC_API_GATEWAY_URL = `${process.env.PUBLIC_API_GATEWAY}`;
  static readonly CORE_STUB_URL = `${process.env.CORE_STUB_URL}`;
  static readonly DEV_F2F_TEST_HARNESS_URL = `https://kmrc-kbv-test-harness-zm-testharness.review-hk.dev.account.gov.uk`;
}
