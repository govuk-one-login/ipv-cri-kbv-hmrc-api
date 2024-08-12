module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
  },
  plugins: [
    "@typescript-eslint", // Plugin for TypeScript linting
    "prettier", // Plugin for integrating Prettier with ESLint
  ],
  extends: [
    "eslint:recommended", // Use recommended ESLint rules
    "plugin:@typescript-eslint/recommended", // Use recommended rules from @typescript-eslint
    "plugin:prettier/recommended", // Integrates Prettier with ESLint
  ],
  rules: {
    "prettier/prettier": "error", // Treat Prettier issues as errors
    "@typescript-eslint/explicit-function-return-type": "off", // Disable requiring return types on functions
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
		], // Warn about unused variables with certain patterns
    "@typescript-eslint/explicit-module-boundary-types": "off", // Disable explicit boundary type checks
    "@typescript-eslint/ban-ts-comment": "warn", // Warn about banned TypeScript comments
    "@typescript-eslint/indent": [
      "error",
      "tab",
      {
				MemberExpression: 1,
				SwitchCase: 1,
				ignoredNodes: ["PropertyDefinition"],
			},
    ], // Enforce indentation with tabs
    "comma-dangle": [
      "warn",
      {
        arrays: "always-multiline",
        exports: "always-multiline",
        functions: "never",
        imports: "always-multiline",
        objects: "always-multiline",
			},
    ], // Enforce trailing commas where needed
    indent: "off", // Turn off base indent rule in favor of TypeScript-specific indentation
	},
};
