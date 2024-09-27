import { Statemachine } from "../../../../lib/src/Logging/log-helper-types";
import { SessionItem } from "../../../../lib/src/types/common-types";

export interface SsmParametersInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  requestedParameters: [string];
}
