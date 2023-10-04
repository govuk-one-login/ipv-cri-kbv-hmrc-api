import { CredentialSubjectBuilder } from "../src/credential-subject-builder";

describe("CredentialSubjectBuilder", () => {
  it("should create a CredentialSubject with name, birthDate, and address", () => {
    const nameParts = [
      { type: "GivenName", value: "John" },
      { type: "FamilyName", value: "Doe" },
    ];

    const birthDates = [{ value: "15-01-1990" }, { value: "20-05-2000" }];

    const addresses = [
      {
        streetName: "123 Basildon",
        postalCode: "12345",
        buildingNumber: "10-11",
        addressLocality: "Greater London",
        validFrom: "2020-01-01",
      },
    ];

    const credentialSubject = new CredentialSubjectBuilder()
      .addNames(nameParts)
      .setBirthDate(birthDates)
      .setAddresses(addresses)
      .build();

    expect(credentialSubject.name).toHaveLength(1);
    expect(credentialSubject.name[0].nameParts).toEqual(nameParts);

    expect(credentialSubject.birthDate).toEqual(birthDates);

    expect(credentialSubject.address).toHaveLength(1);
    expect(credentialSubject.address[0]).toEqual(addresses[0]);
  });
});
