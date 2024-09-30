import { LogHelper } from "../../src/Logging/log-helper";
import { Statemachine } from "../../src/Logging/log-helper-types";
import { SessionItem } from "../../src/types/common-types";

jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn(() => ({
    appendKeys: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
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

const unitTestStack = "UNIT-TEST-STACK-UNIT-TEST-STATEMACHINE";
const unitTestUUIDs = `UUID1:UUID2`;
const testStateMachineValue: Statemachine = {
  executionId: `arn:aws:states:REGION:ACCOUNT:express:${unitTestStack}:${unitTestUUIDs}`,
};

describe("log-helper", () => {
  let logHelper: LogHelper;

  beforeEach(() => {
    logHelper = new LogHelper(testServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should log entry with govJourneyId", () => {
    logHelper.setStatemachineValuesToLogging(testStateMachineValue);

    expect(logHelper.logger.appendKeys).toHaveBeenCalledWith({
      source_stack_statemachine: unitTestStack,
    });

    expect(logHelper.logger.appendKeys).toHaveBeenCalledWith({
      statemachine_execution_id_uuids: unitTestUUIDs,
    });
    expect(logHelper.logger.debug).toHaveBeenCalledWith(
      `Attached source_stack_statemachine: ${unitTestStack} and statemachine_execution_id_uuids ${unitTestUUIDs} to LogHelper`
    );
  });

  it("should log entry with source and govJourneyId", () => {
    logHelper.setSessionItemToLogging(testSessionItem);

    expect(logHelper.logger.appendKeys).toHaveBeenCalledWith({
      govuk_signin_journey_id: testSessionItem.clientSessionId,
    });
    expect(logHelper.logger.debug).toHaveBeenCalledWith(
      `Attached govuk_signin_journey_id: ${testSessionItem.clientSessionId} for session_id: ${testSessionItem.sessionId} to LogHelper`
    );
  });

  it("should log info level", () => {
    const message = "Test info message";
    logHelper.info(message);
    expect(logHelper.logger.info).toHaveBeenCalledWith(message);
  });

  it("should log warn level", () => {
    const message = "Test warn message";
    logHelper.warn(message);
    expect(logHelper.logger.warn).toHaveBeenCalledWith(message);
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

describe("log-helper warnings", () => {
  let logHelper: LogHelper;

  beforeEach(() => {
    logHelper = new LogHelper(testServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should warn when not given sessionItem", () => {
    const message = "SessionItem was not provided to LogHelper";

    logHelper.setSessionItemToLogging(undefined);
    expect(logHelper.logger.warn).toHaveBeenCalledWith(message);
  });

  it("should warn when not given statemachine", () => {
    const message =
      "Statemachine executionId not found - cannnot attach statemachine values to LogHelper";

    logHelper.setStatemachineValuesToLogging(undefined);
    expect(logHelper.logger.warn).toHaveBeenCalledWith(message);
  });

  it("should warn when statemachine execution id not in the expected format", () => {
    const message =
      "Statemachine executionId could not be used - expected 9, found 1 parts";

    logHelper.setStatemachineValuesToLogging({
      executionId: "1234",
    });
    expect(logHelper.logger.warn).toHaveBeenCalledWith(message);
  });
});
