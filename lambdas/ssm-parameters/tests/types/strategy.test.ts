import { Strategy, StrategyUtil } from "../../src/types/strategy";

describe("Strategy Tests", () => {
  beforeEach(() => {});

  it.each([
    ["ipv-core-stub", Strategy.STUB],
    ["ipv-core-stub-aws-build", Strategy.STUB],
    ["ipv-core-stub-aws-prod", Strategy.STUB],
    ["ipv-core-stub-aws-build_3rdparty", Strategy.UAT],
    ["ipv-core-stub-aws-prod_3rdparty", Strategy.UAT],
    ["ipv-core-stub-pre-prod-aws-build", Strategy.LIVE],
    ["ipv-core", Strategy.LIVE],
    ["unknown", Strategy.LIVE],
  ])(
    "should return strategy when given client id 'testInputEvent: %s'",
    async (clientIdString: string, expected: Strategy) => {
      const strategy = StrategyUtil.fromClientIdString(clientIdString);

      expect(strategy).toStrictEqual(expected);
    }
  );
});
