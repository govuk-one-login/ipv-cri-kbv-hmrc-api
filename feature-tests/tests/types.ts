export interface Name {
    nameParts: NamePart[];
}

export interface NamePart {
    value: string;
    type: string;
}

export interface BirthDate {
    value: string;
}

export interface Address {
    buildingNumber: string;
    streetName: string;
    addressLocality: string;
    postalCode: string;
    validFrom: string;
}

export interface SocialSecurityRecord {
    personalNumber: string;
}

export interface SharedClaims {
    "@context": string[];
    name: Name[];
    birthDate: BirthDate[];
    address: Address[];
    socialSecurityRecord: SocialSecurityRecord[];
}

export interface GetClaimsUrlResponse {
    sub: string;
    shared_claims: SharedClaims;
    iss: string;
    persistent_session_id: string;
    response_type: string;
    client_id: string;
    govuk_signin_journey_id: string;
    aud: string;
    nbf: number;
    redirect_uri: string;
    state: string;
    exp: number;
    iat: number;
}

export interface CreateSessionRequestResponse {
    request: string;
    client_id: string;
}

export interface SessionResponse {
    session_id: string;
    state: string;
    redirect_uri: string;
}

export interface QuestionResponse {
    questionKey: string;
    info: any[];
}

export interface AuthorizationResponse {
    state: {
        value: string;
    };
    authorizationCode: {
        value: string;
    };
    redirectionURI: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}