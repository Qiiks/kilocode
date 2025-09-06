# kilo-code

## [v4.91.0]

### [FEAT] - Streamable MCP Support

- Added support for streamable HTTP MCP servers with improved configuration validation and backward compatibility for legacy HTTP configurations
- New "streamable-http" server type enables streaming capabilities for HTTP-based MCP servers
- Legacy "http" type configurations are automatically mapped to "streamable-http" for seamless migration
- Enhanced server configuration validation with better error messages and type inference
- Unified configuration schema with proper field validation to prevent mixed configuration errors
- Automatic server type inference based on provided fields (command for stdio, url for HTTP-based servers)
- Detailed console logging for configuration processing and validation steps

### [FIX] - Chat History Loading

- Fixed a bug that prevented older chat histories from being opened. The issue was caused by an undefined `fsPath` in the storage functions.
- Refactored the storage utilities to accept direct file system paths instead of relying on `ExtensionContext`.

### [FIX] - Kilo Code Extension Stability

- Created a `.env` file to resolve the `[MISSING_ENV_FILE]` error and allow for proper configuration of environment variables like the PostHog API key.
- Modified the `CustomModesManager` to use file-based storage (`globalStorageUri`) instead of `globalState` to address the "large extension state detected" warning. This improves performance and stability.
- Implemented a migration process to move chat history from `globalState` to the new file-based storage, ensuring that users retain their old chat history after the update.

### [FIX] - Add .env to build inputs

- Modified `turbo.json` to include `.env` in the build inputs to resolve the `[MISSING_ENV_FILE]` error.

### [FIX] - Resolve Merge Conflicts and Extension Errors

- Manually resolved merge conflicts in `src/core/webview/ClineProvider.ts` and `src/shared/tools.ts`.
- Addressed `Failed to update approval mode: Unable to write chat.tools.autoApprove to Workspace Settings. This setting can be written only into User settings.` and `Cannot register 'chat.tools.autoApprove'. This property is already registered.` by namespacing the setting to `kilo-code.chat.tools.autoApprove` and setting its scope to `"user"` in `package.json`, and updating command handlers.
- Addressed `ERR [Extension Host] Failed to get default model TypeError: fetch failed` by implementing robust error handling and a fallback mechanism.
- Addressed `ERR [Extension Host] Failed to connect to new MCP server playwright: McpError: MCP error -32001: Request timed out` by implementing a `connectWithRetry` method with a timeout and exponential backoff.
- Addressed `WARN [mainThreadStorage] large extension state detected` by migrating task history storage from globalState to disk storage using a new `HistoryService`.
- Addressed `Uncaught TypeError: Cannot read properties of null (reading 'classList')` UI errors by adding proper null checking and optional chaining when accessing DOM elements.
- Addressed "`this.connectWithRetry` is not a function" error in MCPs by implementing a `connectWithRetry` method in [`src/services/mcp/McpHub.ts`](src/services/mcp/McpHub.ts:1).
- Addressed chat history disappearance by implementing a fix for a race condition or silent error during history loading, ensuring that chat history is fully loaded and reloads from the file system if empty.

## [v4.90.0]

- [#2275](https://github.com/Kilo-Org/kilocode/pull/2275) [`4ae9acc`](https://github.com/Kilo-Org/kilocode/commit/4ae9acc00a90331944333356e8b936a0dcc06e77) Thanks [@jeske](https://github.com/jeske)! - fixes an intermittent async race that discards user-chat-input during structured approve/reject

- [#2129](https://github.com/Kilo-Org/kilocode/pull/2129) [`984b5c4`](https://github.com/Kilo-Org/kilocode/commit/984b5c4151945fc483ca1fd08e07c12f61a372da) Thanks [@catrielmuller](https://github.com/catrielmuller)! - Jetbrains Extension Beta

### Patch Changes

- [#2281](https://github.com/Kilo-Org/kilocode/pull/2281) [`71334fc`](https://github.com/Kilo-Org/kilocode/commit/71334fcb9556fc8ada02b707bef9dd09aedf3864) Thanks [@hassoncs](https://github.com/hassoncs)! - Clear images when changing to a model that does not support them

- [#2280](https://github.com/Kilo-Org/kilocode/pull/2280) [`0713b0d`](https://github.com/Kilo-Org/kilocode/commit/0713b0dbfe047ac7f68727d6dd77b780c9006c6b) Thanks [@hassoncs](https://github.com/hassoncs)! - Fix organization switching not saving properly

- [#2287](https://github.com/Kilo-Org/kilocode/pull/2287) [`b5a8550`](https://github.com/Kilo-Org/kilocode/commit/b5a8550a106fcafa31d332f5b76febc34ffc43ec) Thanks [@Qiiks](https://github.com/Qiiks)! - Fix Gemini CLI integration to handle nested response structures

## [v4.89.0]

- [#2242](https://github.com/Kilo-Org/kilocode/pull/2242) [`f474c89`](https://github.com/Kilo-Org/kilocode/commit/f474c89e3881955d2f41b8912b728e91eddb87f8) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Include changes from Roo Code v3.26.4

    - Optimize memory usage for image handling in webview (thanks @daniel-lxs!)
    - Fix: Special tokens should not break task processing (#7539 by @pwilkin, PR by @pwilkin)
    - Add Ollama API key support for Turbo mode (#7147 by @LivioGama, PR by @app/roomote)
    - Add optional input image parameter to image generation tool (thanks @roomote!)
    - Refactor: Flatten image generation settings structure (thanks @daniel-lxs!)
    - Show console logging in vitests when the --no-silent flag is set (thanks @hassoncs!)
    - feat: Add experimental image generation tool with OpenRouter integration (thanks @daniel-lxs!)
    - Fix: Resolve GPT-5 Responses API issues with condensing and image support (#7334 by @nlbuescher, PR by @daniel-lxs)
    - Fix: Hide .kilocodeignore'd files from environment details by default (#7368 by @AlexBlack772, PR by @app/roomote)
    - Fix: Exclude browser scroll actions from repetition detection (#7470 by @cgrierson-smartsheet, PR by @app/roomote)
    - Add Vercel AI Gateway provider integration (thanks @joshualipman123!)
    - Add support for Vercel embeddings (thanks @mrubens!)
    - Enable on-disk storage for Qdrant vectors and HNSW index (thanks @daniel-lxs!)
    - Update tooltip component to match native VSCode tooltip shadow styling (thanks @roomote!)
    - Fix: remove duplicate cache display in task header (thanks @mrubens!)
    - Random chat text area cleanup (thanks @cte!)
    - feat: Add Deepseek v3.1 to Fireworks AI provider (#7374 by @dmarkey, PR by @app/roomote)
    - Fix: Make auto approve toggle trigger stay (#3909 by @kyle-apex, PR by @elianiva)
    - Fix: Preserve user input when selecting follow-up choices (#7316 by @teihome, PR by @daniel-lxs)
    - Fix: Handle Mistral thinking content as reasoning chunks (#6842 by @Biotrioo, PR by @app/roomote)
    - Fix: Resolve newTaskRequireTodos setting not working correctly (thanks @hannesrudolph!)
    - Fix: Requesty model listing (#7377 by @dtrugman, PR by @dtrugman)
    - feat: Hide static providers with no models from provider list (thanks @daniel-lxs!)
    - Add todos parameter to new_task tool usage in issue-fixer mode (thanks @hannesrudolph!)
    - Handle substitution patterns in command validation (thanks @mrubens!)
    - Mark code-workspace files as protected (thanks @mrubens!)
    - Update list of default allowed commands (thanks @mrubens!)
    - Follow symlinks in rooignore checks (thanks @mrubens!)
    - Show cache read and write prices for OpenRouter inference providers (thanks @chrarnoldus!)
