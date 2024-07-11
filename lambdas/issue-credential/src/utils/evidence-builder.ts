export type BirthDate = {
  value: string;
};

export type NamePart = {
  type: string;
  value: string;
};

export type Evidence = {
  checkDetails?: Array<string>; //update in 1193
  failedCheckDetails?: Array<string>; //update in 1193
  ci?: Array<string>; //update in 1193
  verificationScore: number;
  txn: string;
  type: string;
};

export class EvidenceBuilder {
  verificationScore: number = 0;
  txn: string = "";
  type: string = "IdentityCheck";

  addVerificationScore(verificationScore: number): this {
    this.verificationScore = verificationScore;
    return this;
  }
  addTxn(txn: string) {
    this.txn = txn;
    return this;
  }

  build(): Array<Evidence> {
    const evidence = {} as Evidence;

    evidence.verificationScore = this.verificationScore;
    evidence.txn = this.txn;
    evidence.type = this.type;

    const evidenceArray = new Array<Evidence>();
    evidenceArray.push(evidence);

    return evidenceArray;
  }
}
