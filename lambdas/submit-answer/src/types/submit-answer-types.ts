import { SessionItem } from "../../../../lib/src/types/common-types";
import { OTGToken } from "../../../../lib/src/types/otg-token-types";
import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";

export interface SubmitAnswerInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  nino: string;
  savedAnswersItem: SavedAnswersItem;
  parameters: any;
  otgToken: OTGToken;
}

export interface SavedAnswersItem {
  expiryDate: number;
  answers: [questionKey: string, questionKey: string];
  correlationId: string;
  sessionId: string;
}
