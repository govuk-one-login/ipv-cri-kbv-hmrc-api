type Name = {
  nameParts: Array<NamePart>;
};

export type BirthDate = {
  value: string;
};

export type NamePart = {
  type: string;
  value: string;
};

export type SocialSecurityRecord = {
  personalNumber: string;
};

export type CredentialSubject = {
  socialSecurityRecord: Array<SocialSecurityRecord>;
  name: Array<Name>;
  birthDate: Array<BirthDate>;
};

export class CredentialSubjectBuilder {
  private socialSecurityRecord: Array<SocialSecurityRecord> = [];
  private name: Array<NamePart> = [];
  private birthDate: Array<BirthDate> = [];

  setSocialSecurityRecord(socialSecurityRecord: SocialSecurityRecord[]) {
    this.socialSecurityRecord = socialSecurityRecord;
    return this;
  }

  addNames(names: Array<NamePart>) {
    this.name = names;
    return this;
  }
  setBirthDate(birthDate: BirthDate[]): this {
    this.birthDate = birthDate;
    return this;
  }

  build(): CredentialSubject {
    const credentialSubject = {} as CredentialSubject;
    credentialSubject.socialSecurityRecord = this.socialSecurityRecord;

    if (this.name.length != 0)
      credentialSubject.name = [{ nameParts: this.name } as Name];

    credentialSubject.birthDate = this.birthDate;

    return credentialSubject;
  }
}
