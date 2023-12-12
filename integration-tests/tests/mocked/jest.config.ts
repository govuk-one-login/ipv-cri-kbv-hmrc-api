import type { Config } from "jest";
import baseConfig from "../../jest.config";

export default {
  ...baseConfig,
  displayName: "integration-tests/mocked",
} satisfies Config;
