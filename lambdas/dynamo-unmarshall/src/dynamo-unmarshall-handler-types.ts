import { Statemachine } from "../../../lib/src/Logging/log-helper-types";
import { SessionItem } from "../../../lib/src/types/common-types";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

export interface DynamoUnmarshallInputs {
  sessionItem: SessionItem;
  statemachine: Statemachine;
  marshalledPayload: AttributeValue | Record<string, AttributeValue>;
}
