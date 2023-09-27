/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
import type { Config } from "@jest/types";
import commonConfig from "./jest.config.common";
const config: Config.InitialOptions = {
  ...commonConfig,
  testMatch: ["**/tests/mocked/*.test.ts"],
};
export default config;
