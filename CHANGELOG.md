### [FIX] - Add .env to build inputs

- Modified `turbo.json` to include `.env` in the build inputs to resolve the `[MISSING_ENV_FILE]` error.

### [FIX] - Resolve Merge Conflicts and Extension Errors

- Manually resolved merge conflicts in `src/core/webview/ClineProvider.ts` and `src/shared/tools.ts`.
- Addressed `Failed to update approval mode: Unable to write chat.tools.autoApprove to Workspace Settings. This setting can be written only into User settings.` and `Cannot register 'chat.tools.autoApprove'. This property is already registered.` by namespacing the setting to `kilo-code.chat.tools.autoApprove` and setting its scope to `"user"` in `package.json`, and updating command handlers.
- Addressed `ERR [Extension Host] Failed to get default model TypeError: fetch failed` by implementing robust error handling and a fallback mechanism.
- Addressed `ERR [Extension Host] Failed to connect to new MCP server playwright: McpError: MCP error -32001: Request timed out` by implementing a `connectWithRetry` method with a timeout and exponential backoff.
- Addressed `WARN [mainThreadStorage] large extension state detected` by migrating task history storage from globalState to disk storage using a new `HistoryService`.
- Addressed `Uncaught TypeError: Cannot read properties of null (reading 'classList')` UI errors by adding proper null checking and optional chaining when accessing DOM elements.

## [v4.91.2]

- [#2342](https://github.com/Kilo-Org/kilocode/pull/2342) [`6641568`](https://github.com/Kilo-Org/kilocode/commit/6641568fedba0b5f0a76ce9c5d88182b58b327a5) Thanks [@catrielmuller](https://github.com/catrielmuller)! - Fix Jetbrains editor detection

## [v4.91.1]

- [#2310](https://github.com/Kilo-Org/kilocode/pull/2310) [`29c7af6`](https://github.com/Kilo-Org/kilocode/commit/29c7af60d8c5c285b28ce2f9bd1bfeff1d59dc40) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Thanks @Qiiks! - Remove duplicate Qwen Code provider settings

- [#2322](https://github.com/Kilo-Org/kilocode/pull/2322) [`669713e`](https://github.com/Kilo-Org/kilocode/commit/669713e6a66ce6599664e15450bf2c917861df51) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fixed the maximum output size of Claude Opus 4.1, which was inadvertenly set to 8192 rather than 32k

- [#2332](https://github.com/Kilo-Org/kilocode/pull/2332) [`e3eea75`](https://github.com/Kilo-Org/kilocode/commit/e3eea758975c2ef3da34dec167ea373277ab5928) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fixed an HTTP 500 error with OpenAI-compatible providers when no custom temperature is set

## [v4.91.0]

- [#2289](https://github.com/Kilo-Org/kilocode/pull/2289) [`13c45e5`](https://github.com/Kilo-Org/kilocode/commit/13c45e59adc7d4f337dacb8eda5e35127639c241) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Added support for Kimi K2 0905 to Chutes, Fireworks, Groq and Moonshot providers
- [#2294](https://github.com/Kilo-Org/kilocode/pull/2294) [`980a253`](https://github.com/Kilo-Org/kilocode/commit/980a253ccc906c7a40ef65ab4a7513097b99648b) Thanks [@catrielmuller](https://github.com/catrielmuller)! - Jetbrains - MultiDiff / See New Changes support

### Patch Changes

- [#2281](https://github.com/Kilo-Org/kilocode/pull/2281) [`71334fc`](https://github.com/Kilo-Org/kilocode/commit/71334fcb9556fc8ada02b707bef9dd09aedf3864) Thanks [@hassoncs](https://github.com/hassoncs)! - Clear images when changing to a model that does not support them
- [#2280](https://github.com/Kilo-Org/kilocode/pull/2280) [`0713b0d`](https://github.com/Kilo-Org/kilocode/commit/0713b0dbfe047ac7f68727d6dd77b780c9006c6b) Thanks [@hassoncs](https://github.com/hassoncs)! - Fix organization switching not saving properly
- [#2287](https://github.com/Kilo-Org/kilocode/pull/2287) [`b5a8550`](https://github.com/Kilo-Org/kilocode/commit/b5a8550a106fcafa31d332f5b76febc34ffc43ec) Thanks [@Qiiks](https://github.com/Qiiks)! - Fix Gemini CLI integration to handle nested response structures
