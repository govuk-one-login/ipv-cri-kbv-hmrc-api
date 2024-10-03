import {
  PersonIdentityDateOfBirth,
  PersonIdentityName,
  PersonIdentitySocialSecurityRecord,
} from "../../../../lib/src/types/common-types";

export type CredentialSubject = {
  socialSecurityRecord: Array<PersonIdentitySocialSecurityRecord> | undefined;
  name: Array<PersonIdentityName>;
  birthDate: Array<PersonIdentityDateOfBirth>;
};

export class CredentialSubjectBuilder {
  private socialSecurityRecord:
    | Array<PersonIdentitySocialSecurityRecord>
    | undefined;
  private name: Array<PersonIdentityName> = [];
  private birthDate: Array<PersonIdentityDateOfBirth> = [];

  setSocialSecurityRecord(
    socialSecurityRecord: PersonIdentitySocialSecurityRecord[] | undefined
  ) {
    this.socialSecurityRecord = socialSecurityRecord;
    return this;
  }

  addNames(names: Array<PersonIdentityName>) {
    this.name = names;
    return this;
  }
  setBirthDate(birthDate: PersonIdentityDateOfBirth[]): this {
    this.birthDate = birthDate;
    return this;
  }

  build(): CredentialSubject {
    const credentialSubject = {} as CredentialSubject;
    credentialSubject.socialSecurityRecord = this.socialSecurityRecord;

    if (this.name.length != 0) credentialSubject.name = this.name;

    credentialSubject.birthDate = this.birthDate;

    return credentialSubject;
  }
}
