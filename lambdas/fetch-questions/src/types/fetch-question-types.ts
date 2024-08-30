import {
  SessionItem,
  PersonIdentityItem,
} from "../../../../lib/src/types/common-types";

export interface FetchQuestionInputs {
  sessionId: string;
  questionsUrl: string;
  userAgent: string;
  issuer: string;
  bearerToken: string;
  personIdentityItem: PersonIdentityItem;
  sessionItem: SessionItem;
}
