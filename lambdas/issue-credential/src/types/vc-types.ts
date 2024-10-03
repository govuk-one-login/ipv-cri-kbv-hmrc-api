import { CredentialSubject } from "../utils/credential-subject-builder";
import { Evidence } from "../utils/evidence-builder";

export class Vc {
  evidence: Array<Evidence>;
  credentialSubject: CredentialSubject;
  type: Array<string>;

  constructor(
    evidence: Array<Evidence>,
    credentialSubject: CredentialSubject,
    type: Array<string>
  ) {
    this.evidence = evidence;
    this.credentialSubject = credentialSubject;
    this.type = type;
  }
}

export class VerifiableCredential {
  sub: string;
  nbf: number;
  iss: string;
  vc: Vc;
  jti: string;

  constructor(sub: string, nbf: number, iss: string, vc: Vc, jti: string) {
    this.sub = sub;
    this.nbf = nbf;
    this.iss = iss;
    this.vc = vc;
    this.jti = jti;
  }
}
