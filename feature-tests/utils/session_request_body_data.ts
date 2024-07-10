import { CurrentTimeDescriptor } from "./utility";

const currentTime = getCurrentTimestamp();
const futureTime = getFutureTimestamp();
const pastTime = getPastTimestamp();

export const SESSION_REQUEST_BODY = {
  sub: "urn:fdc:gov.uk:2022:dbf5896f-69b4-4f04-b5e9-8241430c6b20",
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
    socialSecurityRecord: [
      {
        personalNumber: "AA000003D",
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
  iss: "https://cri.core.build.stubs.account.gov.uk",
  persistent_session_id: "685ac5b9-a2d7-44e5-bbb8-b86199266f1b",
  response_type: "code",
  client_id: "ipv-core-stub-aws-build",
  govuk_signin_journey_id: "fef3ae92-c117-4f3f-9bbb-82f351d5bc33",
  aud: "https://review-hk.dev.account.gov.uk",
  nbf: futureTime.milliseconds,
  redirect_uri: "http://localhost:8085/callback",
  state: "_ZaXhgKA3Bb6aIQhz-VKQPa99z0-n101KQl9vVjvIPQ",
  exp: futureTime.milliseconds,
  iat: futureTime.milliseconds,
};

function getCurrentTimestamp(date = new Date()): CurrentTimeDescriptor {
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}

export function getFutureTimestamp(date = new Date()): CurrentTimeDescriptor {
  date.setMinutes(date.getMinutes() + 60);
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}

export function getPastTimestamp(date = new Date()): CurrentTimeDescriptor {
  const min = 5;
  date.setMinutes(date.getMinutes() - min);
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}
