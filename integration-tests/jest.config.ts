import { Config } from "jest";
import baseConfig from "../jest.config.base";

export default {
  ...baseConfig,
  projects: ["tests/*/jest.config.ts"],
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/tests/infra/**/*.test.ts"],
  collectCoverage: false,
  modulePaths: [],
} satisfies Config;
