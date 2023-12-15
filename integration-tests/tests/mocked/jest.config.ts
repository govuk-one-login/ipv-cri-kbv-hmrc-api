import type { Config } from "jest";
import baseConfig from "../../jest.config";

export default {
  ...baseConfig,
  projects: [],
  testTimeout: 30_000,
  displayName: "integration-tests/mocked",
} satisfies Config;
