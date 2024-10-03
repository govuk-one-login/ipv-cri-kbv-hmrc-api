const KBV_RESPONSE_MODE = "free_text";
const CHECK_METHOD = "KBV";

export type Check = {
  kbvResponseMode: string;
  kbvQuality: number;
  checkMethod: string;
};

export class CheckDetailsBuilder {
  public buildCheckDetails(checkDetailsCount: number): Array<Check> {
    const checkDetails: Array<Check> = [];
    for (let i = 0; i < checkDetailsCount; i++) {
      checkDetails.push({
        kbvResponseMode: KBV_RESPONSE_MODE,
        kbvQuality: 2,
        checkMethod: CHECK_METHOD,
      });
    }
    return checkDetails;
  }
}
