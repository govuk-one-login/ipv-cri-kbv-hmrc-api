import { defineFeature, loadFeature } from "jest-cucumber";
import request from 'supertest';
import { timeDelayForTestEnvironment } from '../../../utils/utility';
import EndPoints from '../../../apiEndpoints/endpoints';



const feature = loadFeature(
  "./tests/resources/features/authorizationGet/authorizationGet-sessionId-HappyPath.feature"
);

defineFeature(feature, (test) => {
  let getAuthorizationToken: any;
  let sessionId: string;

// beforeEach(async () => {
//   });

async function userIdentityAsJwtStringForHmrcUpdatedUser(  
  givenName: string,
  familyName: string,
  criId: string,
  rowNumber: string): Promise<void> {
    const coreStubUrl = EndPoints.CORE_STUB_URL;

    const SESSION_REQUEST_BODY = await createRequest(coreStubUrl, criId, updatedJsonString);
}

test('Happy Path - Get Request to Authorization Endpoint for redirect_uri', ({
    given,
    then,
  }) => {
    given(/^I send a Get request to the Authorization endpoint with headers (.*) and (.*)$/, async () => {
      async (contentType: string, accept: string) => {
        await timeDelayForTestEnvironment(4000);
        getAuthorizationToken = await request(EndPoints.BASE_URL)
          .get(EndPoints.AUTHORIZATION_URL + sessionId)
          // .set('Authorization', 'Bearer' + ' ' + authorizationToken)
          .set('Content-Type', contentType)
          .set('Accept', accept);
        console.log('GET Response Body = ' + JSON.stringify(getAuthorizationToken, undefined, 2));
      };
    });

    then(
      /^I should receive a response with (.*) and valid sessionId$/,
      async (statusCode: string) => {
        // expect(getAuthorizationToken.statusCode).toBe(Number(statusCode));
        getAuthorizationToken.body();
        // expect(getAuthorizationToken.body.vcs).toEqual(sessionId);
      },
    );
  });
});


async function userIdentityAsJwtStringForupdatedUser(
  givenName: string,
  familyName: string,
  criId: string,
  rowNumber: string
): Promise<void> {
  const coreStubUrl = EndPoints.CORE_STUB_URL;
  
  const jsonNode = await getSessionJwtAsJson(criId, rowNumber);
  const nameArray = jsonNode.get('shared_claims').get('name');
  const firstItemInNameArray = nameArray.get(0);
  const namePartsNode = firstItemInNameArray.get('nameParts');
  const firstItemInNamePartsArray = namePartsNode.get(0);
  (firstItemInNamePartsArray as ObjectNode).put('value', givenName);
  const secondItemInNamePartsArray = namePartsNode.get(1);
  (secondItemInNamePartsArray as ObjectNode).put('value', familyName);
  const updatedJsonString = jsonNode.toString();
  console.log(`updatedJsonString = ${updatedJsonString}`);
  const SESSION_REQUEST_BODY = await createRequest(coreStubUrl, criId, updatedJsonString);
  console.log(`SESSION_REQUEST_BODY = ${SESSION_REQUEST_BODY}`);

  // Capture client id for using later in the auth request
  const CLIENT_ID = ['client_id'];
  console.log(`CLIENT_ID = ${CLIENT_ID}`);
}

async function getSessionJwtAsJson(criId: string, rowNumber: string): Promise<JsonNode> {
  // Implementation of getSessionJwtAsJson
  return new JsonNode();
}

async function createRequest(coreStubUrl: string, criId: string, updatedJsonString: string): Promise<string> {
  // Implementation of createRequest
  return '';
}

const objectMapper = {
  readValue: async <T>(input: string, typeReference: TypeReference<T>, p0: {}): Promise<T> => {
      // Implementation of readValue
      return {} as T;
  }
};