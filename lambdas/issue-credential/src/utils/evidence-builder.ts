import { Check } from "./check-details-builder";

export type Evidence = {
  checkDetails?: Array<Check>;
  failedCheckDetails?: Array<Check>;
  ci?: Array<string>;
  verificationScore: number;
  txn: string;
  type: string;
};

export class EvidenceBuilder {
  checkDetails: Array<Check> | undefined;
  failedCheckDetails: Array<Check> | undefined;
  verificationScore: number = 0;
  ci: Array<string> = [];
  txn: string = "";
  type: string = "IdentityCheck";

  addCheckDetails(checkDetails: Array<Check>): this {
    if (checkDetails.length > 0) {
      this.checkDetails = checkDetails;
    } else {
      this.checkDetails = undefined;
    }
    return this;
  }
  addFailedCheckDetails(failedCheckDetails: Array<Check>): this {
    if (failedCheckDetails.length > 0) {
      this.failedCheckDetails = failedCheckDetails;
    } else {
      this.failedCheckDetails = undefined;
    }
    return this;
  }
  addVerificationScore(verificationScore: number): this {
    this.verificationScore = verificationScore;
    return this;
  }
  addTxn(txn: string) {
    this.txn = txn;
    return this;
  }
  addCi(ci: Array<string>) {
    this.ci = ci;
    return this;
  }

  build(): Array<Evidence> {
    const evidence = {} as Evidence;

    evidence.checkDetails = this.checkDetails;
    evidence.failedCheckDetails = this.failedCheckDetails;
    evidence.verificationScore = this.verificationScore;
    evidence.ci = this.ci;
    evidence.txn = this.txn;
    evidence.type = this.type;

    const evidenceArray = new Array<Evidence>();
    evidenceArray.push(evidence);

    return evidenceArray;
  }
}
