import type { Config } from "jest";

export default {
  projects: [
    "lambdas/*/jest.config.ts",
    "lib/jest.config.ts",
    "integration-tests/jest.config.ts",
  ],
} satisfies Config;
