const tsPlugin = require("@typescript-eslint/eslint-plugin");
module.exports = [
  {
    ignores: ["node_modules"],
    languageOptions: {
      parser: require.resolve("@typescript-eslint/parser"),
      parserOptions: { project: "./tsconfig.json" }
    },
    plugins: { "@typescript-eslint": tsPlugin },
    // incorporate the plugin's recommended config object for flat config usage:
    ...tsPlugin.configs.recommended,
    rules: {}
  }
];