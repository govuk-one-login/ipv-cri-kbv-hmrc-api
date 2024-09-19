import { LogHelper } from "../../src/Logging/log-helper";
import { SessionItem } from "../../src/types/common-types";

jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn(() => ({
    appendKeys: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

const testServiceName: string = "unit-test-service";
const testSessionItem: SessionItem = {
  expiryDate: 1234,
  clientIpAddress: "127.0.0.1",
  redirectUri: "http://localhost:8085/callback",
  clientSessionId: "2d35a412-125e-423e-835e-ca66111a38a1",
  createdDate: 1722954983024,
  clientId: "unit-test-clientid",
  subject: "urn:fdc:gov.uk:2022:6dab2b2d-5fcb-43a3-b682-9484db4a2ca5",
  persistentSessionId: "6c33f1e4-70a9-41f6-a335-7bb036edd3ca",
  attemptCount: 0,
  sessionId: "665ed4d5-7576-4c4b-84ff-99af3a57ea64",
  state: "7f42f0cc-1681-4455-872f-dd228103a12e",
};

describe("log-helper", () => {
  let logHelper: LogHelper;

  beforeEach(() => {
    logHelper = new LogHelper(testServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should log entry with source and govJourneyId", () => {
    logHelper.setSessionItemToLogging(testSessionItem);

    expect(logHelper.logger.appendKeys).toHaveBeenCalledWith({
      govuk_signin_journey_id: testSessionItem.clientSessionId,
    });
    expect(logHelper.logger.info).toHaveBeenCalledWith(
      `Logging attached to government journey id: ${testSessionItem.clientSessionId}`
    );
  });

  it("should log info level", () => {
    const message = "Test info message";
    logHelper.info(message);
    expect(logHelper.logger.info).toHaveBeenCalledWith(message);
  });

  it("should log debug level", () => {
    const message = "Test debug message";
    logHelper.debug(message);
    expect(logHelper.logger.debug).toHaveBeenCalledWith(message);
  });

  it("should log error level", () => {
    const message = "Test error message";
    logHelper.error(message);
    expect(logHelper.logger.error).toHaveBeenCalledWith(message);
  });
});
