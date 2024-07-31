import type { Config } from "jest";
import baseConfig from "../jest.config";

export default {
  ...baseConfig,
  rootDir: "..",
  reporters: [["github-actions", { silent: false }], "summary"],
} satisfies Config;
