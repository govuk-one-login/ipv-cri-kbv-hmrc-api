module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      "./tsconfig.eslint.json",
      "lambdas/**/tsconfig.json",
      "./feature-tests/tsconfig.json",
    ],
    sourceType: "module",
    ecmaVersion: 2022,
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  globals: {
    sinon: true,
    expect: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "prettier",
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  ignorePatterns: [
    "node_modules",
    ".aws-sam",
    "build",
    "dist",
    "dotenv",
    "coverage",
  ],
  rules: {
    "no-console": 2,
    "padding-line-between-statements": [
      "error",
      { blankLine: "any", prev: "*", next: "*" },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
    ],
  },
};
