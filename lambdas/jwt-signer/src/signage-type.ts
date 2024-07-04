import { MessageType } from "@aws-sdk/client-kms";

export type SignageType = {
  message: Buffer | Uint8Array;
  type: MessageType;
};
