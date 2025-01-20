import type { Config } from "jest";
import dotenv from "dotenv";
dotenv.config();

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/**/*.step.ts", "**/**/**/*.step.ts"],
  verbose: true,
  forceExit: true,
  setupFiles: ["./jest-cucumber-config"],
  coverageReporters: ["html", "text"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "results", outputName: "report.xml" }],
    [
      "./node_modules/jest-html-reporter",
      {
        pageTitle: "HMRC KBV CRI - Test Report",
        outputPath: "results/index.html",
      },
    ],
  ],
  testTimeout: 100_000,
};
export default config;
