import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { SessionItem } from "../../../lib/src/types/common-types";

export interface JwtSignerInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  header: string;
  claimsSet: string;
  kid: string;
}
