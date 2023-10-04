type Name = {
  nameParts: Array<NamePart>;
};

export type BirthDate = {
  value: string;
};

export type Address = {
  streetName: string;
  postalCode: string;
  buildingNumber: string;
  addressLocality: string;
  validFrom: string;
};

export type NamePart = {
  type: string;
  value: string;
};

export type CredentialSubject = {
  name: Array<Name>;
  birthDate: Array<BirthDate>;
  address: Array<Address>;
};

export class CredentialSubjectBuilder {
  private name: Array<NamePart>;
  private address: Array<Address>;
  private birthDate: Array<BirthDate>;

  constructor() {}

  addName(type: string, value: string): CredentialSubjectBuilder {
    this.name.push({ type, value } as NamePart);
    return this;
  }
  addNames(names: Array<NamePart>) {
    this.name = names;
    return this;
  }
  setBirthDate(birthDates: Array<BirthDate>): CredentialSubjectBuilder {
    this.birthDate = birthDates;
    return this;
  }

  setAddresses(addreses: Array<Address>): CredentialSubjectBuilder {
    this.address = addreses;
    return this;
  }
  build(): CredentialSubject {
    const credentialSubject = {} as CredentialSubject;
    if (this.name.length != 0)
      credentialSubject.name = [{ nameParts: this.name } as Name];
    if (this.address.length != 0) credentialSubject.address = this.address;
    if (this.birthDate.length != 0)
      credentialSubject.birthDate = this.birthDate;

    return credentialSubject;
  }
}
