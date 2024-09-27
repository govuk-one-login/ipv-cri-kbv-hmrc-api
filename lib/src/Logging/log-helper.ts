import { Logger } from "@aws-lambda-powertools/logger";
import { SessionItem } from "../types/common-types";
import { Statemachine } from "./log-helper-types";

const EXPECTED_EXECUTION_ID_PARTS = 9;
const PARTS_STACK_STATEMACHINE_INDEX = 6;
const PARTS_EXECUTIONID_PART1_INDEX = 7;
const PARTS_EXECUTIONID_PART2_INDEX = 8;

export class LogHelper {
  public logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger({ serviceName: serviceName });
  }

  setSessionItemToLogging(sessionItem: SessionItem | undefined) {
    if (!sessionItem) {
      this.logger.warn("SessionItem was not provided to LogHelper");
      return;
    }

    this.logger.appendKeys({
      govuk_signin_journey_id: sessionItem.clientSessionId,
    });
    this.logger.debug(
      `Attached govuk_signin_journey_id: ${sessionItem.clientSessionId} for session_id: ${sessionItem.sessionId} to LogHelper`
    );
  }

  setStatemachineValuesToLogging(statemachine: Statemachine | undefined) {
    // Splits apart the string which is epxected to be in the format
    // arn:aws:states:REGION:ACCOUNT:express:STACK-STATEMACHINE:EXECUTIONID_PART1:EXECUTIONID_PART2
    if (!statemachine?.executionId) {
      this.logger.warn(
        "Statemachine executionId not found - cannnot attach statemachine values to LogHelper"
      );
      return;
    }

    const executionIdParts = statemachine.executionId.split(":");
    if (executionIdParts.length != EXPECTED_EXECUTION_ID_PARTS) {
      this.logger.warn(
        `Statemachine executionId could not be used - expected ${EXPECTED_EXECUTION_ID_PARTS}, found ${executionIdParts.length} parts`
      );

      return;
    }

    const sourceStackStateMachine =
      executionIdParts[PARTS_STACK_STATEMACHINE_INDEX];
    // "P1:P2"
    const statemachineExecutionIdUuids = `${executionIdParts[PARTS_EXECUTIONID_PART1_INDEX]}:${executionIdParts[PARTS_EXECUTIONID_PART2_INDEX]}`;

    this.logger.appendKeys({
      source_stack_statemachine: sourceStackStateMachine,
    });

    this.logger.appendKeys({
      statemachine_execution_id_uuids: statemachineExecutionIdUuids,
    });
    this.logger.debug(
      `Attached source_stack_statemachine: ${sourceStackStateMachine} and statemachine_execution_id_uuids ${statemachineExecutionIdUuids} to LogHelper`
    );
  }

  info(message: string) {
    this.logger.info(message);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  error(message: string) {
    this.logger.error(message);
  }
}
