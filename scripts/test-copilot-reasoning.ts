/**
 * Script to test Copilot provider with GPT-4.1 or GPT-5-mini and capture complete output
 * including any reasoning/opaque fields
 *
 * This script will:
 * 1. Authenticate with GitHub Copilot using device code flow
 * 2. Make a request to GPT-4.1 or GPT-5-mini models
 * 3. Log the complete raw response including all fields to a file
 *
 * Usage:
 *   npx ts-node scripts/test-copilot-reasoning.ts [model] [prompt]
 *
 * Examples:
 *   npx ts-node scripts/test-copilot-reasoning.ts gpt-4.1 "What is 2+2?"
 *   npx ts-node scripts/test-copilot-reasoning.ts gpt-5-mini "Explain recursion"
 */

import { promises as fs } from "fs"
import { join } from "path"
import { homedir } from "os"

// Constants from the copilot provider
const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code"
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
const GITHUB_API_KEY_URL = "https://api.github.com/copilot_internal/v2/token"
const GITHUB_COPILOT_API_BASE = "https://api.githubcopilot.com/"

const COPILOT_DEFAULT_HEADER = {
	accept: "application/json",
	"content-type": "application/json",
	"editor-version": "vscode/1.85.1",
	"editor-plugin-version": "copilot/1.155.0",
	"user-agent": "GithubCopilot/1.155.0",
	"accept-encoding": "gzip,deflate,br",
}

interface DeviceCodeResponse {
	device_code: string
	user_code: string
	verification_uri: string
	expires_in: number
	interval: number
}

interface AccessTokenResponse {
	access_token?: string
	error?: string
	error_description?: string
}

interface CopilotTokenResponse {
	token: string
	expires_at: number
	refresh_in?: number
	endpoints?: {
		api?: string
	}
}

interface StoredTokenData {
	access_token: string
	api_key?: string
	api_key_expires_at?: number
	api_base?: string
}

// Token storage location
const tokenDir = join(homedir(), ".roo-code", "copilot")
const tokenFile = join(tokenDir, "tokens.json")

// Output log file - fix the path to avoid duplicating 'scripts'
const outputDir = join(process.cwd(), "output")
const getOutputFile = () => join(outputDir, `copilot-reasoning-${Date.now()}.json`)

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	bold: "\x1b[1m",
}

function log(message: string, color: keyof typeof colors = "white") {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
	console.log()
	log(`${"=".repeat(60)}`, "cyan")
	log(`  ${title}`, "bold")
	log(`${"=".repeat(60)}`, "cyan")
	console.log()
}

async function ensureDir(dir: string): Promise<void> {
	try {
		await fs.mkdir(dir, { recursive: true })
	} catch (error) {
		// Directory might already exist
	}
}

async function loadStoredTokens(): Promise<Partial<StoredTokenData>> {
	try {
		await ensureDir(tokenDir)
		const data = await fs.readFile(tokenFile, "utf-8")
		return JSON.parse(data)
	} catch (error) {
		return {}
	}
}

async function saveTokens(tokens: StoredTokenData): Promise<void> {
	await ensureDir(tokenDir)
	await fs.writeFile(tokenFile, JSON.stringify(tokens, null, 2))
}

async function authenticateWithDeviceCode(): Promise<string> {
	log("Starting device code authentication flow...", "yellow")

	// Step 1: Get device code
	const deviceResponse = await fetch(GITHUB_DEVICE_CODE_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"User-Agent": "GitHubCopilotChat/0.26.7",
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			scope: "read:user",
		}),
	})

	if (!deviceResponse.ok) {
		throw new Error(`Failed to get device code: ${deviceResponse.statusText}`)
	}

	const deviceData = (await deviceResponse.json()) as DeviceCodeResponse

	// Step 2: Show user code to user
	logSection("GitHub Authentication Required")
	log(`Please go to: ${deviceData.verification_uri}`, "cyan")
	log(`Enter code: ${deviceData.user_code}`, "green")
	log(`\nWaiting for authorization... (expires in ${Math.floor(deviceData.expires_in / 60)} minutes)`, "yellow")

	// Step 3: Poll for access token
	return pollForAccessToken(deviceData.device_code, deviceData.interval || 5)
}

async function pollForAccessToken(deviceCode: string, interval: number): Promise<string> {
	const maxAttempts = 60 // 5 minutes maximum

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, interval * 1000))

		try {
			const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"User-Agent": "GitHubCopilotChat/0.26.7",
				},
				body: JSON.stringify({
					client_id: GITHUB_CLIENT_ID,
					device_code: deviceCode,
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				}),
			})

			const data = (await response.json()) as AccessTokenResponse

			if (data.access_token) {
				log("✅ Authentication successful!", "green")
				return data.access_token
			}

			if (data.error === "authorization_pending") {
				process.stdout.write(".")
				continue
			}

			if (data.error === "slow_down") {
				interval = Math.min(interval * 2, 10)
				continue
			}

			if (data.error) {
				throw new Error(`GitHub OAuth error: ${data.error} - ${data.error_description}`)
			}
		} catch (error) {
			// If it's a JSON parsing error from a 400 response, continue polling
			if (error instanceof SyntaxError) {
				continue
			}
			throw error
		}
	}

	throw new Error("Authentication timed out. Please try again.")
}

async function refreshApiKey(accessToken: string): Promise<CopilotTokenResponse> {
	const response = await fetch(GITHUB_API_KEY_URL, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${accessToken}`,
			"User-Agent": "GitHubCopilotChat/0.26.7",
			"Editor-Version": "vscode/1.85.1",
			"Editor-Plugin-Version": "copilot-chat/0.26.7",
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to get API key: ${response.statusText}`)
	}

	return (await response.json()) as CopilotTokenResponse
}

async function getApiKey(): Promise<{ apiKey: string; apiBase?: string }> {
	try {
		const stored = await loadStoredTokens()

		// Check if we have a valid API key
		if (stored.api_key && stored.api_key_expires_at) {
			const now = Math.floor(Date.now() / 1000)
			if (stored.api_key_expires_at > now + 60) {
				log("Using cached API key", "green")
				return {
					apiKey: stored.api_key,
					apiBase: stored.api_base,
				}
			}
		}

		// If we have an access token, try to refresh the API key
		if (stored.access_token) {
			try {
				log("Refreshing API key...", "yellow")
				const copilotToken = await refreshApiKey(stored.access_token)
				await saveTokens({
					access_token: stored.access_token,
					api_key: copilotToken.token,
					api_key_expires_at: copilotToken.expires_at,
					api_base: copilotToken.endpoints?.api,
				})
				log("API key refreshed successfully", "green")
				return {
					apiKey: copilotToken.token,
					apiBase: copilotToken.endpoints?.api,
				}
			} catch (error) {
				log("Failed to refresh API key, starting new authentication", "yellow")
			}
		}

		// Start device code flow
		const accessToken = await authenticateWithDeviceCode()
		const copilotToken = await refreshApiKey(accessToken)

		await saveTokens({
			access_token: accessToken,
			api_key: copilotToken.token,
			api_key_expires_at: copilotToken.expires_at,
			api_base: copilotToken.endpoints?.api,
		})

		return {
			apiKey: copilotToken.token,
			apiBase: copilotToken.endpoints?.api,
		}
	} catch (error) {
		throw new Error(`Failed to authenticate with Copilot: ${error}`)
	}
}

interface ChatCompletionRequest {
	model: string
	messages: Array<{
		role: string
		content: string
	}>
	max_tokens?: number
	temperature?: number
	stream?: boolean
}

interface StreamChunk {
	id?: string
	object?: string
	created?: number
	model?: string
	choices?: Array<{
		index?: number
		delta?: {
			role?: string
			content?: string
			reasoning_content?: string
			reasoning?: string
			thinking?: string
			[key: string]: unknown
		}
		finish_reason?: string | null
		[key: string]: unknown
	}>
	usage?: {
		prompt_tokens?: number
		completion_tokens?: number
		total_tokens?: number
		[key: string]: unknown
	}
	[key: string]: unknown
}

async function testChatCompletion(
	apiKey: string,
	apiBase: string | undefined,
	modelId: string,
	prompt: string,
	stream: boolean = true,
): Promise<{
	success: boolean
	rawResponse: unknown
	streamChunks?: StreamChunk[]
	fullContent?: string
	reasoningContent?: string
	error?: string
}> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE
	const chatUrl = `${baseURL.replace(/\/$/, "")}/chat/completions`

	log(`\nTesting model: ${modelId}`, "magenta")
	log(`Endpoint: ${chatUrl}`, "blue")
	log(`Stream: ${stream}`, "blue")
	log(`Prompt: "${prompt}"`, "cyan")

	const requestBody: ChatCompletionRequest = {
		model: modelId,
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
		max_tokens: 2000,
		temperature: 0.7,
		stream: stream,
	}

	try {
		const response = await fetch(chatUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				...COPILOT_DEFAULT_HEADER,
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			const errorText = await response.text()
			log(`  ❌ HTTP ${response.status}: ${response.statusText}`, "red")
			log(`  Error: ${errorText}`, "red")
			return {
				success: false,
				rawResponse: { status: response.status, statusText: response.statusText, body: errorText },
				error: `HTTP ${response.status}: ${errorText}`,
			}
		}

		if (stream) {
			// Handle streaming response
			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body reader available")
			}

			const decoder = new TextDecoder()
			const chunks: StreamChunk[] = []
			let fullContent = ""
			let reasoningContent = ""
			let buffer = ""

			log("\n  Streaming response:", "green")

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split("\n")
				buffer = lines.pop() || ""

				for (const line of lines) {
					const trimmedLine = line.trim()
					if (!trimmedLine || trimmedLine === "data: [DONE]") continue

					if (trimmedLine.startsWith("data: ")) {
						try {
							const jsonStr = trimmedLine.slice(6)
							const chunk = JSON.parse(jsonStr) as StreamChunk
							chunks.push(chunk)

							// Extract content
							const delta = chunk.choices?.[0]?.delta
							if (delta) {
								if (delta.content) {
									fullContent += delta.content
									process.stdout.write(delta.content)
								}

								// Check for any reasoning-related fields
								if (delta.reasoning_content) {
									reasoningContent += delta.reasoning_content
									log(`\n  [Reasoning Content]: ${delta.reasoning_content}`, "yellow")
								}
								if (delta.reasoning) {
									log(`\n  [Reasoning]: ${delta.reasoning}`, "yellow")
								}
								if (delta.thinking) {
									log(`\n  [Thinking]: ${delta.thinking}`, "yellow")
								}

								// Log any unknown fields in delta
								const knownFields = new Set([
									"role",
									"content",
									"reasoning_content",
									"reasoning",
									"thinking",
								])
								for (const [key, value] of Object.entries(delta)) {
									if (!knownFields.has(key) && value !== undefined && value !== null) {
										log(`\n  [Unknown Delta Field - ${key}]: ${JSON.stringify(value)}`, "magenta")
									}
								}
							}

							// Log any unknown fields in chunk
							const knownChunkFields = new Set([
								"id",
								"object",
								"created",
								"model",
								"choices",
								"usage",
								"system_fingerprint",
							])
							for (const [key, value] of Object.entries(chunk)) {
								if (!knownChunkFields.has(key) && value !== undefined && value !== null) {
									log(`\n  [Unknown Chunk Field - ${key}]: ${JSON.stringify(value)}`, "magenta")
								}
							}

							// Also check for reasoning fields using our extractor
							const reasoningFields = extractReasoningFields(chunk)
							for (const [path, value] of Object.entries(reasoningFields)) {
								log(
									`\n  🧠 [REASONING FIELD - ${path}]: ${JSON.stringify(value).substring(0, 500)}`,
									"yellow",
								)
							}
						} catch (parseError) {
							log(`\n  [Parse Error]: ${trimmedLine}`, "red")
						}
					}
				}
			}

			console.log() // New line after streaming

			return {
				success: true,
				rawResponse: chunks,
				streamChunks: chunks,
				fullContent,
				reasoningContent: reasoningContent || undefined,
			}
		} else {
			// Handle non-streaming response
			const responseText = await response.text()
			const data = JSON.parse(responseText)

			log("\n  Response received:", "green")
			log(`  ${JSON.stringify(data, null, 2)}`, "white")

			// Check for reasoning fields
			const message = data.choices?.[0]?.message
			let reasoningContent = ""

			if (message) {
				if (message.reasoning_content) {
					reasoningContent = message.reasoning_content
					log(`\n  [Reasoning Content]: ${reasoningContent}`, "yellow")
				}
				if (message.reasoning) {
					log(`\n  [Reasoning]: ${message.reasoning}`, "yellow")
				}
				if (message.thinking) {
					log(`\n  [Thinking]: ${message.thinking}`, "yellow")
				}

				// Log any unknown fields
				const knownFields = new Set([
					"role",
					"content",
					"reasoning_content",
					"reasoning",
					"thinking",
					"tool_calls",
					"function_call",
					"refusal",
				])
				for (const [key, value] of Object.entries(message)) {
					if (!knownFields.has(key) && value !== undefined && value !== null) {
						log(`\n  [Unknown Message Field - ${key}]: ${JSON.stringify(value)}`, "magenta")
					}
				}
			}

			// Log any unknown fields at top level
			const knownTopFields = new Set([
				"id",
				"object",
				"created",
				"model",
				"choices",
				"usage",
				"system_fingerprint",
			])
			for (const [key, value] of Object.entries(data)) {
				if (!knownTopFields.has(key) && value !== undefined && value !== null) {
					log(`\n  [Unknown Top-Level Field - ${key}]: ${JSON.stringify(value)}`, "magenta")
				}
			}

			// Also check for reasoning fields using our extractor
			const reasoningFields = extractReasoningFields(data)
			for (const [path, value] of Object.entries(reasoningFields)) {
				log(`\n  🧠 [REASONING FIELD - ${path}]: ${JSON.stringify(value).substring(0, 500)}`, "yellow")
			}

			return {
				success: true,
				rawResponse: data,
				fullContent: message?.content || "",
				reasoningContent: reasoningContent || undefined,
			}
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		log(`  ❌ Error: ${errorMsg}`, "red")
		return {
			success: false,
			rawResponse: { error: errorMsg },
			error: errorMsg,
		}
	}
}

async function saveOutput(data: unknown, filename: string): Promise<void> {
	await ensureDir(outputDir)
	const outputPath = join(outputDir, filename)
	await fs.writeFile(outputPath, JSON.stringify(data, null, 2))
	log(`\nOutput saved to: ${outputPath}`, "green")
}

// Fields related to reasoning from Copilot extension analysis
const REASONING_FIELD_NAMES = [
	"reasoning_opaque",
	"reasoning_text",
	"cot_id",
	"cot_summary",
	"thinking",
	"signature",
	"reasoning_content",
	"reasoning",
]

// Extract reasoning-related fields from any object recursively
function extractReasoningFields(obj: unknown, path: string = ""): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	if (!obj || typeof obj !== "object") {
		return result
	}

	const o = obj as Record<string, unknown>

	for (const key of Object.keys(o)) {
		const fullPath = path ? `${path}.${key}` : key
		const value = o[key]

		// Check if this is a reasoning-related field
		if (REASONING_FIELD_NAMES.includes(key) && value !== undefined && value !== null) {
			result[fullPath] = value
		}

		// Recurse into objects and arrays
		if (Array.isArray(value)) {
			value.forEach((item, index) => {
				const subFields = extractReasoningFields(item, `${fullPath}[${index}]`)
				Object.assign(result, subFields)
			})
		} else if (value && typeof value === "object") {
			const subFields = extractReasoningFields(value, fullPath)
			Object.assign(result, subFields)
		}
	}

	return result
}

async function main() {
	logSection("Copilot Reasoning/Opaque Field Test Script")

	// Parse command line arguments
	// Default to oswe-vscode-prime which has been shown to include reasoning_opaque fields
	const modelArg = process.argv[2] || "oswe-vscode-prime"
	const promptArg =
		process.argv[3] ||
		"What is the sum of 15 + 27? Please think through this step by step and explain your reasoning."

	log(`Model: ${modelArg}`, "blue")
	log(`Prompt: ${promptArg}`, "blue")

	// Authenticate
	logSection("Authentication")
	const { apiKey, apiBase } = await getApiKey()
	log(`API Base: ${apiBase || GITHUB_COPILOT_API_BASE}`, "blue")

	// Test results collection
	const allResults: {
		timestamp: string
		model: string
		prompt: string
		streamingResult: unknown
		nonStreamingResult: unknown
	}[] = []

	// Models to test - prioritize models that have shown reasoning fields
	const allModels = ["oswe-vscode-prime", "o3-mini", "o1-mini", "gpt-4.1", "gpt-4o", "gpt-5-mini", "grok-code-fast-1"]
	const modelsToTest = modelArg === "all" ? allModels : [modelArg]

	for (const modelId of modelsToTest) {
		logSection(`Testing ${modelId}`)

		// Test with streaming
		logSection(`${modelId} - Streaming Mode`)
		const streamingResult = await testChatCompletion(apiKey, apiBase, modelId, promptArg, true)

		// Wait a bit between requests
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Test without streaming
		logSection(`${modelId} - Non-Streaming Mode`)
		const nonStreamingResult = await testChatCompletion(apiKey, apiBase, modelId, promptArg, false)

		allResults.push({
			timestamp: new Date().toISOString(),
			model: modelId,
			prompt: promptArg,
			streamingResult,
			nonStreamingResult,
		})

		// Wait between models
		await new Promise((resolve) => setTimeout(resolve, 2000))
	}

	// Save all results
	const outputFilename = `copilot-reasoning-${Date.now()}.json`
	await saveOutput(allResults, outputFilename)

	// Summary
	logSection("Summary")

	for (const result of allResults) {
		log(`\nModel: ${result.model}`, "cyan")
		log(`  Streaming: ${(result.streamingResult as { success: boolean }).success ? "✅" : "❌"}`, "white")
		log(`  Non-Streaming: ${(result.nonStreamingResult as { success: boolean }).success ? "✅" : "❌"}`, "white")

		const streamReasoning = (result.streamingResult as { reasoningContent?: string }).reasoningContent
		const nonStreamReasoning = (result.nonStreamingResult as { reasoningContent?: string }).reasoningContent

		if (streamReasoning) {
			log(`  Streaming Reasoning Content Found: Yes (${streamReasoning.length} chars)`, "yellow")
		}
		if (nonStreamReasoning) {
			log(`  Non-Streaming Reasoning Content Found: Yes (${nonStreamReasoning.length} chars)`, "yellow")
		}
	}

	log(`\n\nFull output saved to: scripts/output/${outputFilename}`, "green")
	log("Analyze this file to inspect all response fields including any reasoning/opaque data.", "green")
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
