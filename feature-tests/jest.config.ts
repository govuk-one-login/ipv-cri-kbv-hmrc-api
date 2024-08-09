import type { Config } from "jest";
import dotenv from "dotenv";
dotenv.config();

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/feature-tests/tests/**/*.test.ts"],
  verbose: true,
  forceExit: true,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true,
      },
    ],
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'results', outputName: 'report.xml' }],
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "HMRC KBV Test Report",
      "outputPath": "results/test-report.html"
    }]
  ],
  testTimeout: 100_000,
};

export default config;
