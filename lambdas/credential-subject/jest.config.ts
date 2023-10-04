import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ["lambdas/**/*.{js,ts}", "!**/tests/**"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coveragePathIgnorePatterns: ["config.ts", "node_modules/"],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  testMatch: ["**/tests/**/*.test.ts"],
  preset: "ts-jest",
  testEnvironment: "node",
};

export default config;
