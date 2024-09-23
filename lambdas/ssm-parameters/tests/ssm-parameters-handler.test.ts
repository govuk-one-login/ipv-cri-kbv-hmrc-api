import { SsmParametersHandler } from "../src/ssm-parameters-handler";
import { Context } from "aws-lambda";
import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import { jest } from "@jest/globals";
import { MetricsProbe } from "../../../lib/src/Service/metrics-probe";
import { SessionItem } from "../../../lib/src/types/common-types";
import {
  CompletionStatus,
  HandlerMetric,
} from "../../../lib/src/MetricTypes/handler-metric-types";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { Strategy } from "../src/types/strategy";

jest.mock("@aws-lambda-powertools/metrics");
jest.mock("../src/../../../lib/src/Service/metrics-probe");

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

describe("ssm-parameters-handler", () => {
  let mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
  let mockedSsmProvider = jest.mocked(SSMProvider).prototype;
  let ssmParametersHandler: SsmParametersHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset due to test changing this
    testSessionItem.clientId = "unit-test-clientid";

    mockMetricsProbe = jest.mocked(MetricsProbe).prototype;
    mockedSsmProvider = jest.mocked(SSMProvider).prototype;

    jest.spyOn(mockMetricsProbe, "captureMetric");
    jest.spyOn(mockedSsmProvider, "getParametersByName").mockResolvedValue({});

    ssmParametersHandler = new SsmParametersHandler(mockMetricsProbe);
  });

  it.each([
    [
      ["ssmTestName"],
      {
        result: {
          ssmTestName: { value: "ssmTestNameReturn" },
        },
      },
    ],
    [
      ["ssmTestName1", "ssmTestName2"],
      {
        result: {
          ssmTestName1: { value: "ssmTestNameReturn1" },
          ssmTestName2: { value: "ssmTestNameReturn2" },
        },
      },
    ],
    [
      ["ssmTestName1", "ssmTestName2", "ssmTestName3"],
      {
        result: {
          ssmTestName1: { value: "ssmTestNameReturn1" },
          ssmTestName2: { value: "ssmTestNameReturn2" },
          ssmTestName3: { value: "ssmTestNameReturn3" },
        },
      },
    ],
    [
      [
        "/stackname/ssmTestName1",
        "/prefix/ssmTestName2",
        "/level1/nested/ssmTestName3",
        "/level1/level2/nested/ssmTestName4",
      ],
      {
        result: {
          ssmTestName1: { value: "ssmTestNameReturn1" },
          ssmTestName2: { value: "ssmTestNameReturn2" },
          ssmTestName3: { value: "ssmTestNameReturn3" },
          ssmTestName4: { value: "ssmTestNameReturn4" },
        },
      },
    ],
  ])(
    "should return 1 object in the correct format when given a list of non strategy parameters 'testInputEvent: %s'",
    async (testRequestedParameters: string[], resultMap: any) => {
      // Mocked Get for all parameters
      const parameters = {
        _errors: [],
      };
      testRequestedParameters.forEach(function (path: string) {
        const tkey = path.slice(path.lastIndexOf("/") + 1);
        const name = tkey.charAt(0).toLowerCase() + tkey.slice(1);
        Object.assign(parameters, {
          [path]: resultMap.result[name].value,
        });
      });
      mockedSsmProvider.getParametersByName.mockResolvedValueOnce(parameters);

      const payload = await ssmParametersHandler.handler(
        {
          requestedParameters: testRequestedParameters,
          sessionItem: testSessionItem,
        },
        {} as Context
      );

      expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(1);
      expect(payload).toStrictEqual(resultMap);

      expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
        HandlerMetric.CompletionStatus,
        MetricUnit.Count,
        CompletionStatus.OK
      );
    }
  );

  it.each([
    [
      [
        "/stackname/ssmStrategyParam1",
        "/prefix/ssmStrategyParam2",
        "/level1/nested/ssmStrategyParam3",
        "/level1/level2/nested/ssmStrategyParam4",
      ],
      [
        "ipv-core-stub",
        "ipv-core-stub-aws-build",
        "ipv-core-stub-aws-prod",
        "ipv-core-stub-aws-build_3rdparty",
        "ipv-core-stub-aws-prod_3rdparty",
        "ipv-core-stub-pre-prod-aws-build",
        "ipv-core",
      ],
      [
        Strategy.STUB,
        Strategy.STUB,
        Strategy.STUB,
        Strategy.UAT,
        Strategy.UAT,
        Strategy.LIVE,
        Strategy.LIVE,
      ],
      {
        result: {
          ssmStrategyParam1: {
            value: JSON.stringify({
              STUB: "ValueForStub",
              UAT: "ValueForUat",
              LIVE: "ValueForLive",
            }),
          },
          ssmStrategyParam2: {
            value: JSON.stringify({
              STUB: "ValueForStub",
              UAT: "ValueForUat",
              LIVE: "ValueForLive",
            }),
          },
          ssmStrategyParam3: {
            value: JSON.stringify({
              STUB: "ValueForStub",
              UAT: "ValueForUat",
              LIVE: "ValueForLive",
            }),
          },
          ssmStrategyParam4: {
            value: JSON.stringify({
              STUB: "ValueForStub",
              UAT: "ValueForUat",
              LIVE: "ValueForLive",
            }),
          },
        },
      },
    ],
  ])(
    "should return 1 object in the correct format when given a list of strategy parameters and ClientId'testInputEvent: %s'",
    async (
      testRequestedParameters: string[],
      clients: string[],
      expectedStrategy: Strategy[],
      resultMap: any
    ) => {
      // This does the same checks for each client id and build the expectet result from the handlers
      clients.forEach(
        await async function (clientId: string, index: number) {
          // Strategy Setups
          testSessionItem.clientId = clientId;
          const expectedStrategyForThisClient = expectedStrategy[index];

          // Mocked Get for all parameters
          const parameters = {
            _errors: [],
          };
          // Expected result after json + strategy processing
          const expectedResult = { result: {} };
          testRequestedParameters.forEach(function (path: string) {
            const tkey = path.slice(path.lastIndexOf("/") + 1);
            const name = tkey.charAt(0).toLowerCase() + tkey.slice(1);

            // getParametersByName Mock return
            Object.assign(parameters, {
              [path]: resultMap.result[name].value,
            });

            // ssmParametersHandler expected Return
            Object.assign(expectedResult.result, {
              [name]: {
                value: JSON.parse(resultMap.result[name].value)[
                  expectedStrategyForThisClient
                ],
              },
            });
          });

          // Resets the mock so we can check that getParametersByName called ONCE for each client separately (and not a running count)
          mockedSsmProvider.getParametersByName.mockReset();

          mockedSsmProvider.getParametersByName.mockResolvedValueOnce(
            parameters
          );

          const payload = await ssmParametersHandler.handler(
            {
              requestedParameters: testRequestedParameters,
              sessionItem: testSessionItem,
            },
            {} as Context
          );

          expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(
            1
          );
          expect(payload).toStrictEqual(expectedResult);

          expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
            HandlerMetric.CompletionStatus,
            MetricUnit.Count,
            CompletionStatus.OK
          );
        }
      );
    }
  );

  it("should return error when given an empty list", async () => {
    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: [],
        sessionItem: testSessionItem,
      },
      {} as Context
    );

    expect(payload).toStrictEqual({
      error: "SsmParametersHandler : requestedParameters array was empty",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(0);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("should throw error when given bad SSM parameter", async () => {
    jest
      .spyOn(SSMProvider.prototype, "getParametersByName")
      .mockImplementation((parameters) =>
        Promise.resolve({ _errors: Object.keys(parameters) })
      );

    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: ["BadParameter"],
        sessionItem: testSessionItem,
      },
      {} as Context
    );

    expect(payload).toStrictEqual({
      error:
        "SsmParametersHandler : Following SSM parameters do not exist: BadParameter",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(1);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("should throw error when given multiple bad SSM parameter", async () => {
    jest
      .spyOn(SSMProvider.prototype, "getParametersByName")
      .mockImplementation((parameters) =>
        Promise.resolve({ _errors: Object.keys(parameters) })
      );

    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: ["BadParameter", "SecondBadParameter"],
        sessionItem: testSessionItem,
      },
      {} as Context
    );

    expect(payload).toStrictEqual({
      error:
        "SsmParametersHandler : Following SSM parameters do not exist: BadParameter, SecondBadParameter",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(1);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("should throw error when given good SSM parameter and a bad SSM parameter", async () => {
    jest
      .spyOn(SSMProvider.prototype, "getParametersByName")
      .mockImplementation(() =>
        Promise.resolve({ _errors: ["SecondBadParameter"] })
      );

    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: ["GoodParameter", "SecondBadParameter"],
        sessionItem: testSessionItem,
      },
      {} as Context
    );

    expect(payload).toStrictEqual({
      error:
        "SsmParametersHandler : Following SSM parameters do not exist: SecondBadParameter",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(1);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("should throw error when strategy pararameter value is not valid json", async () => {
    const parameters = {
      UnitTestJsonParameter: "UAT STUB LIVE but Not JSON!",
      _errors: [],
    };

    mockedSsmProvider.getParametersByName.mockResolvedValueOnce(parameters);

    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: ["UnitTestJsonParameter"],
        sessionItem: testSessionItem,
      },
      {} as Context
    );

    expect(payload).toStrictEqual({
      error:
        "SsmParametersHandler : Failed to parse json for unitTestJsonParameter",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(1);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });

  it("should throw error when not given an array", async () => {
    const payload = await ssmParametersHandler.handler(
      {
        requestedParameters: undefined,
        sessionItem: testSessionItem,
      } as never,
      {} as Context
    );

    expect(payload).toStrictEqual({
      error: "SsmParametersHandler : requestedParameters must be string array",
    });
    expect(mockedSsmProvider.getParametersByName).toHaveBeenCalledTimes(0);

    expect(mockMetricsProbe.captureMetric).toHaveBeenCalledWith(
      HandlerMetric.CompletionStatus,
      MetricUnit.Count,
      CompletionStatus.ERROR
    );
  });
});
