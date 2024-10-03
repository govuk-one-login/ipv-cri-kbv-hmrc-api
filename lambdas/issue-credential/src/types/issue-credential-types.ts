import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";
import {
  SessionItem,
  PersonIdentityItem,
} from "../../../../lib/src/types/common-types";

export interface IssueCredentialInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  personIdentityItem: PersonIdentityItem;
  bearerToken: string;
  maxJwtTtl: string;
  jwtTtlUnit: string;
  issuer: string;
  verifiableCredentialKmsSigningKeyId: string;
}
