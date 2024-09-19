import {
  SessionItem,
  PersonIdentityItem,
} from "../../../../lib/src/types/common-types";

export interface IssueCredentialInputs {
  bearerToken: string;
  sessionItem: SessionItem;
  personIdentityItem: PersonIdentityItem;
  maxJwtTtl: string;
  jwtTtlUnit: string;
  issuer: string;
  verifiableCredentialKmsSigningKeyId: string;
}
