import { Context } from "aws-lambda";
import { CurrentTimeHandler } from "../src/current-time-handler";
describe("current-time-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should return the current time as epoch", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1622502000000);
    const timeHandler = new CurrentTimeHandler();
    const result = await timeHandler.handler({}, {} as Context);
    expect(result).toEqual((1622502000000 / 1000).toString());
  });
});
