interface Address {
  buildingNumber: string;
  buildingName: string;
  streetName: string;
  addressLocality: string;
  postalCode: string;
  validFrom: string;
}

export const kid = "0976c11e-8ef3-4659-b7f2-ee0b842b85bd";

export const header = {
  kid,
  type: "JWT",
  alg: "ES256",
};

export const claimsSet = {
  sub: "urn:fdc:gov.uk:2022:0df67954-5537-4c98-92d9-e95f0b2e6f44",
  shared_claims: {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld",
    ],
    name: [
      {
        nameParts: [
          { type: "GivenName", value: "Jim" },
          { type: "FamilyName", value: "Ferguson" },
        ],
      },
    ],
    birthDate: [{ value: "1948-04-23" }],
    address: [
      {
        buildingNumber: "",
        buildingName: "",
        streetName: "",
        addressLocality: "",
        postalCode: "",
        validFrom: "2021-01-01",
      },
    ],
  },
  iss: "https://cri.core.build.stubs.account.gov.uk",
  persistent_session_id: "a67c497b-ac49-46a0-832c-8e7864c6d4cf",
  response_type: "code",
  client_id: "ipv-core-stub-aws-build",
  govuk_signin_journey_id: "84521e2b-43ab-4437-a118-f7c3a6d24c8e",
  aud: "https://review-a.dev.account.gov.uk",
  nbf: 1697516406,
  scope: "openid",
  redirect_uri: "https://cri.core.build.stubs.account.gov.uk/callback",
  state: "diWgdrCGYnjrZK7cMPEKwJXvpGn6rvhCBteCl_I2ejg",
  exp: 4102444800,
  iat: 1697516406,
};

const generateFixedString = (length: number = 10) =>
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".substring(
    0,
    length
  );

const fixedAddressSection: Address = {
  buildingNumber: generateFixedString(),
  buildingName: generateFixedString(),
  streetName: generateFixedString(),
  addressLocality: generateFixedString(),
  postalCode: generateFixedString(),
  validFrom: "2021-01-01",
};

const numAdditionalSections = 15;
const additionalAddressSections = Array(numAdditionalSections).fill(
  fixedAddressSection
);

export const largeClaimsSet = {
  sub: "urn:fdc:gov.uk:2022:0df67954-5537-4c98-92d9-e95f0b2e6f44",
  shared_claims: {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld",
    ],
    name: [
      {
        nameParts: [
          { type: "GivenName", value: "Jim" },
          { type: "FamilyName", value: "Ferguson" },
        ],
      },
    ],
    birthDate: [{ value: "1948-04-23" }],
    address: [
      {
        buildingNumber: "",
        buildingName: "",
        streetName: "",
        addressLocality: "",
        postalCode: "",
        validFrom: "2021-01-01",
      },
      ...additionalAddressSections,
    ],
  },
  iss: "https://cri.core.build.stubs.account.gov.uk",
  persistent_session_id: "a67c497b-ac49-46a0-832c-8e7864c6d4cf",
  response_type: "code",
  client_id: "ipv-core-stub-aws-build",
  govuk_signin_journey_id: "84521e2b-43ab-4437-a118-f7c3a6d24c8e",
  aud: "https://review-a.dev.account.gov.uk",
  nbf: 1697516406,
  scope: "openid",
  redirect_uri: "https://cri.core.build.stubs.account.gov.uk/callback",
  state: "diWgdrCGYnjrZK7cMPEKwJXvpGn6rvhCBteCl_I2ejg",
  exp: 4102444800,
  iat: 1697516406,
};

export const publicVerifyingJwk = {
  kty: "EC",
  use: "sig",
  alg: "ES256",
  crv: "P-256",
  x: "A84nU-ZLSFNs8VI6VXkunvWwRx-T3gAXvw2JPRrP78c",
  y: "ElcRbqkXk-XBnhYC55hApLY9oGnZA5H5MUlqe02gGXA",
};

export const joseSignature =
  "BiUZkuU4MFE8zg5zpghGdn-g-uepv14qXAXal4vpgnAk0qZSutsRFvhw_YNRoVwxsacBA6RCEHrHmYpTxsJ9sQ";

export const joseLargeClaimsSetSignature =
  "Lz57KV7UC1jY_zabLAiIkXkhktmV0Gwg7rG2Z05roY-Ow150MmfDWbVavcpGP8do88MebxM47H-0q30F-CfB2A";
