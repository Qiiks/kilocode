### [FIX] - Add .env to build inputs

- Modified `turbo.json` to include `.env` in the build inputs to resolve the `[MISSING_ENV_FILE]` error.

### [FIX] - Resolve Merge Conflicts and Extension Errors

- Manually resolved merge conflicts in `src/core/webview/ClineProvider.ts` and `src/shared/tools.ts`.
- Addressed `Failed to update approval mode: Unable to write chat.tools.autoApprove to Workspace Settings. This setting can be written only into User settings.` and `Cannot register 'chat.tools.autoApprove'. This property is already registered.` by namespacing the setting to `kilo-code.chat.tools.autoApprove` and setting its scope to `"user"` in `package.json`, and updating command handlers.
- Addressed `ERR [Extension Host] Failed to get default model TypeError: fetch failed` by implementing robust error handling and a fallback mechanism.
- Addressed `ERR [Extension Host] Failed to connect to new MCP server playwright: McpError: MCP error -32001: Request timed out` by implementing a `connectWithRetry` method with a timeout and exponential backoff.
- Addressed `WARN [mainThreadStorage] large extension state detected` by migrating task history storage from globalState to disk storage using a new `HistoryService`.
- Addressed `Uncaught TypeError: Cannot read properties of null (reading 'classList')` UI errors by adding proper null checking and optional chaining when accessing DOM elements.

## [v4.93.1]

- [#2388](https://github.com/Kilo-Org/kilocode/pull/2388) [`484ced4`](https://github.com/Kilo-Org/kilocode/commit/484ced4df8f6bc24091268d1850c8eba752e7cc8) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Kilo Code Provider Routing settings are now hidden when managed by an organization

## [v4.93.0]

- [#2353](https://github.com/Kilo-Org/kilocode/pull/2353) [`75f8f7b`](https://github.com/Kilo-Org/kilocode/commit/75f8f7b21671ddfba4bdfb441fe3e8fd215530d1) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Include changes from Roo Code v3.27.0

    Added from Roo Code v3.26.5-v3.27.0:

    - Add: Kimi K2-0905 model support in Chutes provider (#7700 by @pwilkin, PR by @app/roomote)
    - Fix: Prevent stack overflow in codebase indexing for large projects (#7588 by @StarTrai1, PR by @daniel-lxs)
    - Fix: Resolve race condition in Gemini Grounding Sources by improving code design (#6372 by @daniel-lxs, PR by @HahaBill)
    - Fix: Preserve conversation context by retrying with full conversation on invalid previous_response_id (thanks @daniel-lxs!)
    - Fix: Identify MCP and slash command config path in multiple folder workspaces (#6720 by @kfuglsang, PR by @NaccOll)
    - Fix: Handle array paths from VSCode terminal profiles correctly (#7695 by @Amosvcc, PR by @app/roomote)
    - Fix: Improve WelcomeView styling and readability (thanks @daniel-lxs!)
    - Fix: Resolve CI e2e test ETIMEDOUT errors when downloading VS Code (thanks @daniel-lxs!)
    - Feature: Add OpenAI Responses API service tiers (flex/priority) with UI selector and pricing (thanks @hannesrudolph!)
    - Feature: Add DeepInfra as a model provider in Roo Code (#7661 by @Thachnh, PR by @Thachnh)
    - Feature: Update kimi-k2-0905-preview and kimi-k2-turbo-preview models on the Moonshot provider (thanks @CellenLee!)
    - Feature: Add kimi-k2-0905-preview to Groq, Moonshot, and Fireworks (thanks @daniel-lxs and Cline!)
    - Fix: Prevent countdown timer from showing in history for answered follow-up questions (#7624 by @XuyiK, PR by @daniel-lxs)
    - Fix: Moonshot's maximum return token count limited to 1024 issue resolved (#6936 by @greyishsong, PR by @wangxiaolong100)
    - Fix: Add error transform to cryptic OpenAI SDK errors when API key is invalid (#7483 by @A0nameless0man, PR by @app/roomote)
    - Fix: Validate MCP tool exists before execution (#7631 by @R-omk, PR by @app/roomote)
    - Fix: Handle zsh glob qualifiers correctly (thanks @mrubens!)
    - Fix: Handle zsh process substitution correctly (thanks @mrubens!)
    - Fix: Minor zh-TW Traditional Chinese locale typo fix (thanks @PeterDaveHello!)
    - Fix: use askApproval wrapper in insert_content and search_and_replace tools (#7648 by @hannesrudolph, PR by @app/roomote)
    - Add Kimi K2 Turbo model configuration to moonshotModels (thanks @wangxiaolong100!)
    - Fix: preserve scroll position when switching tabs in settings (thanks @DC-Dancao!)
    - feat: Add support for Qwen3 235B A22B Thinking 2507 model in chutes (thanks @mohamad154!)
    - feat: Add auto-approve support for MCP access_resource tool (#7565 by @m-ibm, PR by @daniel-lxs)
    - feat: Add configurable embedding batch size for code indexing (#7356 by @BenLampson, PR by @app/roomote)
    - fix: Add cache reporting support for OpenAI-Native provider (thanks @hannesrudolph!)
    - feat: Move message queue to the extension host for better performance (thanks @cte!)

### Patch Changes

- [#2375](https://github.com/Kilo-Org/kilocode/pull/2375) [`5b634bc`](https://github.com/Kilo-Org/kilocode/commit/5b634bc5933eca19abc8f9bb4e011d0dae486b76) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Removed the arbitrary 8192 output limit for Anthropic models

- [#2368](https://github.com/Kilo-Org/kilocode/pull/2368) [`5f4071b`](https://github.com/Kilo-Org/kilocode/commit/5f4071b64d9cbd7a8b37b806a678e0f70457ebee) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fixed context windows being too small when using Ollama Turbo

## [v4.92.1]

- [#2364](https://github.com/Kilo-Org/kilocode/pull/2364) [`7573854`](https://github.com/Kilo-Org/kilocode/commit/75738541270db6702aac649730472c92e8084444) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Remove some nonexistent models from the model selector

## [v4.92.0]

- [#2299](https://github.com/Kilo-Org/kilocode/pull/2299) [`1ab5cc7`](https://github.com/Kilo-Org/kilocode/commit/1ab5cc7d0f9d7748137791043508253af70704a9) Thanks [@catrielmuller](https://github.com/catrielmuller)! - MacOS - System Terminal Notifier Support

### Patch Changes

- [#2352](https://github.com/Kilo-Org/kilocode/pull/2352) [`e343439`](https://github.com/Kilo-Org/kilocode/commit/e34343916be94d0f4374753e0c130b911cfbf20e) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Better error messages are shown when the model currently in use disappears (this will be relevant shortly for Sonoma)

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
