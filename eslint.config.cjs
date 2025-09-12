const tsPlugin = require("@typescript-eslint/eslint-plugin");
module.exports = [
  {
    files: ["src/**/*.ts"],
    ignores: ["**/node_modules/**", "**/dist/**"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: { project: "./tsconfig.json" }
    },
    plugins: { "@typescript-eslint": tsPlugin },
        // Recommended rules for @typescript-eslint (flat config does not support "extends")
        rules: {
          "@typescript-eslint/no-unused-vars": "warn",
          "@typescript-eslint/no-explicit-any": "warn",
          "@typescript-eslint/explicit-module-boundary-types": "warn"
        }
  }
];