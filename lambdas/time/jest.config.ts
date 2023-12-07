import type { Config } from "jest";
import baseConfig from "../../jest.config.base";

export default {
  ...baseConfig,
  displayName: "lambdas/time",
} satisfies Config;
