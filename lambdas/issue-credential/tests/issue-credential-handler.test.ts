import { IssueCredentialHandler } from "../src/issue-credential-handler";

describe("IssueCredentialHandler", () => {
  let issueCredentialHandler: IssueCredentialHandler;

  const mockInputEvent = {
    sessionId: "sessionId",
    sessionItem: {
      Item: {
        expiryDate: {
          N: "1234",
        },
      },
    },
  };

  const mockInputContext = {
    invokedFunctionArn: "test",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    issueCredentialHandler = new IssueCredentialHandler();
  });

  it("Success", async () => {
    const expectedResponse = { "Issue Credential": "Successful" };

    const lambdaResponse = await issueCredentialHandler.handler(
      mockInputEvent,
      mockInputContext
    );

    expect(lambdaResponse).toEqual(expectedResponse);
  });
});
