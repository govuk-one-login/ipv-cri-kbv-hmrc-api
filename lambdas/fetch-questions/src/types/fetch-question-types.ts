import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";
import {
  SessionItem,
  PersonIdentityItem,
} from "../../../../lib/src/types/common-types";

export interface FetchQuestionInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  personIdentityItem: PersonIdentityItem;
  bearerToken: string;
  questionsUrl: string;
  userAgent: string;
  issuer: string;
}
