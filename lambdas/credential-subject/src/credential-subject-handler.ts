import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";

import {
  CredentialSubject,
  CredentialSubjectBuilder,
  BirthDate,
  Address,
  NamePart,
} from "./credential-subject-builder";
import { UserInfoEvent } from "./user-info-event";

const logger = new Logger();
const credentialSubjectBuilder = new CredentialSubjectBuilder();

export class CredentialSubjectHandler implements LambdaInterface {
  public async handler(
    event: UserInfoEvent,
    _context: unknown
  ): Promise<CredentialSubject> {
    try {
      return credentialSubjectBuilder
        .addNames(this.convertEventInputToNames(event))
        .setAddresses(this.convertEventInputToAddress(event))
        .setBirthDate(
          event.userInfoEvent.Items[0].birthDates.L.map(
            (birthDate) => ({ value: birthDate.M.value.S }) as BirthDate
          )
        )
        .build();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error in CredentialSubjectHandler: ${message}`);
      throw error;
    }
  }
  private convertEventInputToNames = (
    event: UserInfoEvent
  ): Array<NamePart> => {
    return event.userInfoEvent.Items[0].names.L[0].M.nameParts.L.map(
      (part) => ({ type: part.M.type.S, value: part.M.value.S }) as NamePart
    );
  };
  private convertEventInputToAddress = (
    event: UserInfoEvent
  ): Array<Address> => {
    return event.userInfoEvent.Items[0].addresses.L.map(
      (address) =>
        ({
          streetName: address.M.streetName.S,
          postalCode: address.M.postalCode.S,
          buildingNumber: address.M.buildingNumber.S,
          validFrom: address.M.validFrom.S,
        }) as Address
    );
  };
}

const handlerClass = new CredentialSubjectHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
