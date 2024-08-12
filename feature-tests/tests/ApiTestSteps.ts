import axios, { AxiosInstance, AxiosResponse } from "axios";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { questionKeyResponse } from "./answer_body";
import { aws4Interceptor } from "aws4-axios";
import Constants from "./ApiConstants";
import {
  GetClaimsUrlResponse,
  CreateSessionRequestResponse,
  SessionResponse,
  QuestionResponse,
  AuthorizationResponse,
  TokenResponse,
} from "./types";
const username = process.env.CORE_STUB_USERNAME;
const password = process.env.CORE_STUB_PASSWORD;
const token = Buffer.from(`${username}:${password}`).toString("base64");
const IPV_STUB_API_INSTANCE = axios.create({
  baseURL: Constants.CORE_STUB_URL,
  headers: {
    Authorization: `Basic ${token}`,
  },
});
const PRIVATE_API_GATEWAY_INSTANCE = axios.create({
  baseURL: Constants.PRIVATE_API_GATEWAY_URL,
});
const PUBLIC_API_GATEWAY_INSTANCE = axios.create({
  baseURL: Constants.PUBLIC_API_GATEWAY_URL,
});
const HARNESS_API_INSTANCE: AxiosInstance = axios.create({ baseURL: Constants.DEV_F2F_TEST_HARNESS_URL });
const customCredentialsProvider = {
	getCredentials: fromNodeProviderChain({
		timeout: 1000,
		maxRetries: 0,
	}),
};
const awsSigv4Interceptor = aws4Interceptor({
	options: {
		region: "eu-west-2",
		service: "execute-api",
	},
	credentials: customCredentialsProvider,
});

HARNESS_API_INSTANCE.interceptors.request.use(awsSigv4Interceptor);

export async function getClaimsUrl(
  selectedNino: string
): Promise<AxiosResponse<GetClaimsUrlResponse>> {
  const path =
    "/backend/generateInitialClaimsSet?cri=hmrc-kbv-cri-dev&rowNumber=197&nino=" +
    selectedNino;
  try {
    const getRequest = await IPV_STUB_API_INSTANCE.get(path);
    expect(getRequest.status).toBe(200);
    return getRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function postUpdatedClaimsUrl(
  claimSetBody: GetClaimsUrlResponse
): Promise<AxiosResponse<CreateSessionRequestResponse>> {
  const path = "/backend/createSessionRequest?cri=hmrc-kbv-cri-dev";
  try {
    const postRequest = await IPV_STUB_API_INSTANCE.post(path, claimSetBody);
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function postRequestToSessionEndpoint(
  postClaimsUrl: CreateSessionRequestResponse
): Promise<AxiosResponse<SessionResponse>> {
  const path = "/session";
  try {
    const postRequest = await PRIVATE_API_GATEWAY_INSTANCE.post(
      path,
      postClaimsUrl,
      { headers: { "x-forwarded-for": "123456789" } }
    );
    expect(postRequest.status).toBe(201);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function postRequestToHmrcKbvEndpoint(sessionId: string) {
  const path = "/fetchquestions";
  try {
    const postRequest = await PRIVATE_API_GATEWAY_INSTANCE.post(
      path,
      {},
      { headers: { "session-id": sessionId } }
    );
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function getRequestToQuestionEndpoint(
  sessionId: string,
  statusCode: number
): Promise<AxiosResponse<QuestionResponse>> {
  const path = "/question";
  try {
    const postRequest = await PRIVATE_API_GATEWAY_INSTANCE.get(path, {
      headers: { "session-id": sessionId },
    });
    expect(postRequest.status).toBe(statusCode);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export function getPayloadByQuestionKey(questionKey: string) {
  const value = questionKeyResponse[questionKey];
  if (value !== undefined) {
    return {
      questionKey: questionKey,
      value: value,
    };
  } else {
    throw new Error(
      `Question key '${questionKey}' not found in questionKeyResponse`
    );
  }
}

export async function postRequestToAnswerEndpoint(
  questionKey: string,
  sessionId: string
) {
  const path = "/answer";
  const requestPayload = getPayloadByQuestionKey(questionKey);
  try {
    const postRequest = await PRIVATE_API_GATEWAY_INSTANCE.post(
      path,
      requestPayload,
      { headers: { "session-id": sessionId } }
    );
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function getRequestAuthorisationCode(
  state: string,
  clientId: string,
  sessionId: string
): Promise<AxiosResponse<AuthorizationResponse>> {
  const path = "/authorization";
  const decodedCoreStubUrl = decodeURIComponent(Constants.CORE_STUB_URL);
  try {
    const postRequest = await PRIVATE_API_GATEWAY_INSTANCE.get(path, {
      params: {
        redirect_uri: `${decodedCoreStubUrl}/callback`,
        state: state,
        scope: "openid",
        response_type: "code",
        client_id: clientId,
      },
      headers: {
        "session-id": sessionId,
      },
    });
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function getTokenRequestPrivateKeyJWT(
  authCode: string,
  sessionId: string
): Promise<AxiosResponse<string>> {
  const path = "/backend/createTokenRequestPrivateKeyJWT";
  try {
    const postRequest = await IPV_STUB_API_INSTANCE.get(path, {
      params: {
        authorization_code: authCode,
        cri: "hmrc-kbv-cri-dev",
      },
      headers: {
        "session-id": sessionId,
      },
    });
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function postAccessTokenRequest(
  getTokenRequest: string
): Promise<AxiosResponse<TokenResponse>> {
  const path = "/token";
  try {
    const postRequest = await PUBLIC_API_GATEWAY_INSTANCE.post(
      path,
      getTokenRequest
    );
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function postRequestHmrcKbvCriVc(
  bearerToken: string
): Promise<AxiosResponse<string>> {
  const path = "/credential/issue";
  try {
    const postRequest = await PUBLIC_API_GATEWAY_INSTANCE.post(
      path,
      {},
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );
    expect(postRequest.status).toBe(200);
    return postRequest;
  } catch (error: any) {
    console.log(`Error response from ${path} endpoint: ${error}`);
    return error.response;
  }
}

export async function validateJwtToken(
  jwtToken: string,
  getClaimsResponse: GetClaimsUrlResponse,
  verificationScore: number
): Promise<void> {
  const [rawHead, rawBody] = jwtToken.split(".");

  await validateRawHead(rawHead);
  validateRawBody(rawBody, getClaimsResponse, verificationScore);
}

async function validateRawHead(rawHead: any): Promise<void> {
  const decodeRawHead = JSON.parse(
    Buffer.from(rawHead.replace(/\W/g, ""), "base64url").toString()
  );
  expect(decodeRawHead.alg).toBe("ES256");
  expect(decodeRawHead.typ).toBe("JWT");
}

function validateRawBody(
  rawBody: any,
  getClaimsResponse: GetClaimsUrlResponse,
  verificationScore: number
): void {
  const decodedBody = JSON.parse(
    Buffer.from(rawBody.replace(/\W/g, ""), "base64url").toString()
  );
  expect(decodedBody.vc.evidence[0].verificationScore).toBe(verificationScore);
  expect(
    decodedBody.vc.credentialSubject.socialSecurityRecord[0].personalNumber
  ).toBe(
    getClaimsResponse.shared_claims.socialSecurityRecord[0].personalNumber
  );
  expect(decodedBody.vc.credentialSubject.name).toStrictEqual(
    getClaimsResponse.shared_claims.name
  );
}

export async function getDbRecordBySessionId(sessionId: string, tableName: string): Promise<any> {
	interface OriginalValue {
		N?: string;
		S?: string;
		BOOL?: boolean;
		L?: OriginalValue[];
		M?: { [key: string]: OriginalValue };
	}

	interface OriginalSessionItem {
		[key: string]: OriginalValue;
	}

	let session;

	const unwrapValue = (value: OriginalValue): any => {
		if (value.N !== undefined) {
			return value.N;
		}
		if (value.S !== undefined) {
			return value.S;
		}
		if (value.BOOL !== undefined) {
			return value.BOOL;
		}
		if (value.L !== undefined) {
			return value.L.map(unwrapValue);
		}
		if (value.M !== undefined) {
			return Object.fromEntries(Object.entries(value.M).map(([k, v]) => [k, unwrapValue(v)]));
		}
		return value;
	};

	try {
		const response = await HARNESS_API_INSTANCE.get<{ Items: OriginalSessionItem[] }>(`getRecordBySessionId/${tableName}/${sessionId}`, {});
		console.log(JSON.stringify(response.data));

		if (response.data.Items && response.data.Items.length > 0) {
			const originalSession = response.data.Items[0]; 
			session = Object.fromEntries(
				Object.entries(originalSession).map(([key, value]) => [key, unwrapValue(value)]),
			) as unknown as any;
		} else {
			console.error('No items found in the response.');
		}
	} catch (e: any) {
		console.error({ message: "getSessionById - failed getting session from Dynamo", e });
	}

	return session;
}
