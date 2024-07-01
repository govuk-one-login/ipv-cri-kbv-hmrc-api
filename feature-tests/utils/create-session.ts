import { timeDelayForTestEnvironment } from '../utils/utility';
import EndPoints from '../apiEndpoints/endpoints';
import request from 'supertest';
import { App } from 'supertest/types';

let getClaimsUrl: any;
let postClaimsUrl: any;
let postSessionEndpoint: any;
let nino: any;

export async function generateClaimsUrl() {
    console.log("setting up session with claimsUrl")
    const rowNumber = ('&rowNumber=197')
    const claimsForUserUrl = (EndPoints.BASE_URL_GET_CLAIMS + EndPoints.CRI_ID)
    getClaimsUrl = await request(EndPoints.BASE_URL)
        .get(claimsForUserUrl + rowNumber)
        .set('Authorization', EndPoints.CORE_STUB_USERNAME + ':' + EndPoints.CORE_STUB_PASSWORD)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
    console.log('Request to generate ClaimSet Status Code  = ' , getClaimsUrl.statusCode)
    console.log('Request to generate ClaimSet Request Body = ' + JSON.stringify(getClaimsUrl, undefined, 2));
    expect(getClaimsUrl.statusCode).toEqual(Number(200));
}

export async function postUpdatedClaimsUrl() {
    console.log("sending payload to CoreStub")
    const claimSetBody = getClaimsUrl.text
    const ninoClaimSet = claimSetBody["nino"] = 'AA000003D'
    console.log('Create Session Request for ClaimSet Status Code 1 1 1 = ' , JSON.stringify(getClaimsUrl.text));
    console.log('Create Session Request for ClaimSet Status Code 1 1 1 = ' , JSON.stringify(ninoClaimSet));
    postClaimsUrl = await request(EndPoints.BASE_URL)
        .post(EndPoints.BASE_URL_POST_CLAIMS + EndPoints.CRI_ID)
        .send(ninoClaimSet)
        .set('Authorization', EndPoints.CORE_STUB_USERNAME + ':' + EndPoints.CORE_STUB_PASSWORD)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
    console.log('Create Session Request for ClaimSet Status Code = ' , postClaimsUrl.statusCode)
   
    console.log('Create Session Request for Encoded ClaimSet Response Body = ' + JSON.stringify(postClaimsUrl, undefined, 2));
    console.log('SESSION CLIENT_ID = ' , JSON.stringify(postClaimsUrl.text.client_id))
    expect(postClaimsUrl.statusCode).toEqual(Number(200));
}

export async function postRequestToSessionEndpoint() {
    console.log("sending payload to CoreStub")
    postSessionEndpoint = await request(EndPoints.PRIVATE_API_GATEWAY_URL)
        .post(EndPoints.SESSION_URL)
        .send(postClaimsUrl.text)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', '123456789');
    console.log('Request to Session endpoint Status Code = ' , postSessionEndpoint.statusCode)
    console.log('Request to Session endpoint Response Body = ' + JSON.stringify(postSessionEndpoint, undefined, 2));
    console.log('SESSION_ID = ' , postSessionEndpoint.body.session_id)
    const sessionIdForUser = postSessionEndpoint.body.session_id
    expect(postSessionEndpoint.statusCode).toEqual(Number(201));
}

export function getSessionId() {
    return postSessionEndpoint.body.session_id
    

}