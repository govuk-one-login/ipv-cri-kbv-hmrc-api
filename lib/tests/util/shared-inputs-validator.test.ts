import { SharedInputsValidator } from "../../src/util/shared-inputs-validator";

describe("SharedInputsValidator", () => {
  // The following tests test the SharedInputsValidator with a sessionItem that is not correct and confims the assoicated error is thrown
  it.each([
    [undefined, "Session item was not provided"],
    [{}, "Session item is empty"],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing sessionId",
    ],
    [
      {
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing expiryDate",
    ],
    [
      {
        expiryDate: "1234",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing clientIpAddress",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing redirectUri",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing clientSessionId",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing createdDate",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing clientId",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing subject",
    ],
    // Made optional
    // [
    //   {
    //     expiryDate: "1234",
    //     clientIpAddress: "127.0.0.1",
    //     redirectUri: "http://localhost:8085/callback",
    //     clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
    //     createdDate: "1722954983024",
    //     clientId: "unit-test-clientid",
    //     subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
    //     attemptCount: "0",
    //     sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
    //     state: "7f42f0cc-1681-4455-872f-dd228103a12e",
    //   },
    //   "Session item missing persistentSessionId",
    // ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
        state: "7f42f0cc-1681-4455-872f-dd228103a12e",
      },
      "Session item missing attemptCount",
    ],
    [
      {
        expiryDate: "1234",
        clientIpAddress: "127.0.0.1",
        redirectUri: "http://localhost:8085/callback",
        clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
        createdDate: "1722954983024",
        clientId: "unit-test-clientid",
        subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
        persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
        attemptCount: "0",
        sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
      },
      "Session item missing state",
    ],
  ])(
    "should return an error sessionItem is missing required values 'testInputEvent: %s, expectedError: %s'",
    async (testInputEvent: any, expectedError: string) => {
      expect(() => {
        SharedInputsValidator.validateUnmarshalledSessionItem(testInputEvent);
      }).toThrow(expectedError);
    }
  );
});
