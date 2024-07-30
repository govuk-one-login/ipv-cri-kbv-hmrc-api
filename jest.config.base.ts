import type { Config } from "jest";

export default {
  preset: "ts-jest",
  clearMocks: true,
  modulePaths: ["<rootDir>/src"],
  collectCoverageFrom: ["<rootDir>/src/**/*"],
  coveragePathIgnorePatterns: ["<rootDir>/src/answer-validation-handler.ts"],
  testPathIgnorePatterns: ["<rootDir>/tests/answer-validation-handler.test.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
} satisfies Config;
