export abstract class SharedInputsValidator {
  public static validateUnmarshalledSessionItem(sessionItem: any) {
    if (!sessionItem) {
      throw new Error("Session item was not provided");
    }

    if (Object.keys(sessionItem).length === 0) {
      throw new Error("Session item is empty");
    }

    if (!sessionItem.sessionId) {
      throw new Error("Session item missing sessionId");
    }

    if (!sessionItem.expiryDate) {
      throw new Error("Session item missing expiryDate");
    }

    if (!sessionItem.clientIpAddress) {
      throw new Error("Session item missing clientIpAddress");
    }

    if (!sessionItem.redirectUri) {
      throw new Error("Session item missing redirectUri");
    }

    if (!sessionItem.clientSessionId) {
      throw new Error("Session item missing clientSessionId");
    }

    if (!sessionItem.createdDate) {
      throw new Error("Session item missing createdDate");
    }

    if (!sessionItem.clientId) {
      throw new Error("Session item missing clientId");
    }

    // Made optional
    // if (!sessionItem.persistentSessionId) {
    //   throw new Error("Session item missing persistentSessionId");
    // }

    if (!sessionItem.attemptCount && sessionItem.attemptCount != 0) {
      throw new Error("Session item missing attemptCount");
    }

    if (!sessionItem.state) {
      throw new Error("Session item missing state");
    }

    if (!sessionItem.subject) {
      throw new Error("Session item missing subject");
    }
  }
}
