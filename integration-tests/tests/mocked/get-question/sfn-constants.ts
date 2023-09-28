import fs from "fs";
import path from "path";

const STATE_MACHINE_FILE = path.join(
  __dirname,
  "../../../../step-functions/get-question.asl.json"
);

export const StepFunctionConstants = {
  mockFileHostPath: path.join(__dirname, "./MockConfigFile.json"),
  mockFileContainerPath: "/home/stepfunctionslocal/MockConfigFile.json",
  DUMMY_ROLE: "arn:aws:iam::123456789012:role/DummyRole",
  STATE_MACHINE_ASL: fs.readFileSync(STATE_MACHINE_FILE).toString(),
  STATE_MACHINE_NAME: "get-question",
  AWS_ACCOUNT_ID: "123456789012",
  AWS_DEFAULT_REGION: "local",
  AWS_ACCESS_KEY_ID: "local",
  AWS_SECRET_ACCESS_KEY: "local", //pragma: allowlist secret
};
