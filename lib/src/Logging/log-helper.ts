import { Logger } from "@aws-lambda-powertools/logger";
import { SessionItem } from "../types/common-types";

export class LogHelper {
  public logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger({ serviceName: serviceName });
  }

  setSessionItemToLogging(sessionItem: SessionItem) {
    this.logger.appendKeys({
      govuk_signin_journey_id: sessionItem.clientSessionId,
    });
    this.logger.info(
      `Logging attached to government journey id: ${sessionItem.clientSessionId}`
    );
  }

  info(message: string) {
    this.logger.info(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  error(message: string) {
    this.logger.error(message);
  }
}
