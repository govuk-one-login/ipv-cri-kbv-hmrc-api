export default class EndPoints {
  static readonly PRIVATE_API_GATEWAY_URL = `${process.env.PRIVATE_API_GATEWAY}`;
  static readonly PUBLIC_API_GATEWAY_URL = `${process.env.PUBLIC_API_GATEWAY}`;
  static readonly CORE_STUB_URL = `${process.env.CORE_STUB_URL}`;
}