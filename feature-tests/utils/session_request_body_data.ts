export const SESSION_REQUEST_BODY = {
  updatedUserString: [
    {
      sub: "urn:fdc:gov.uk:2022:34754e34-32d7-48cc-a970-daeb73835b2a",
      shared_claims: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld",
        ],
        name: [
          {
            nameParts: [
              {
                type: "GivenName",
                value: "KENNETH",
              },
              {
                type: "FamilyName",
                value: "DECERQUEIRA",
              },
            ],
          },
        ],
        birthDate: [
          {
            value: "1965-07-08",
          },
        ],
        address: [
          {
            buildingNumber: "8",
            streetName: "HADLEY ROAD",
            addressLocality: "BATH",
            postalCode: "BA2 5AA",
            validFrom: "2021-01-01",
          },
        ],
      },
      iss: "https://cri.core.stubs.account.gov.uk",
      persistent_session_id: "39beb0f9-c8ba-40d0-8246-9588c4738011",
      response_type: "code",
      client_id: "ipv-core-stub-aws-prod",
      govuk_signin_journey_id: "7669dfdd-e071-4f78-93c6-329f982c51f0",
      aud: "https://review-f.dev.account.gov.uk",
      nbf: 1718285069,
      redirect_uri: "https://cri.core.stubs.account.gov.uk/callback",
      state: "8gKN3jO8bOjsDWKjso4NuNKYUEIhpjDHxgdrU3QLnEo",
      exp: 1718288669,
      iat: 1718285069,
    },
  ],
};
