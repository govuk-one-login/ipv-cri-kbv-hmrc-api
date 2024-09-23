export enum Strategy {
  STUB = "STUB",
  UAT = "UAT",
  LIVE = "LIVE",
}

export class StrategyUtil {
  public static fromClientIdString(clientIdString: string): Strategy {
    switch (clientIdString) {
      case "ipv-core-stub":
        return Strategy.STUB; // Legacy core-stub-id
      case "ipv-core-stub-aws-build":
        return Strategy.STUB;
      case "ipv-core-stub-aws-prod":
        return Strategy.STUB;
      case "ipv-core-stub-aws-build_3rdparty":
        return Strategy.UAT;
      case "ipv-core-stub-aws-prod_3rdparty":
        return Strategy.UAT;
      case "ipv-core-stub-pre-prod-aws-build":
        return Strategy.LIVE;
      case "ipv-core":
        return Strategy.LIVE;
      default:
        return Strategy.LIVE;
    }
  }
}
