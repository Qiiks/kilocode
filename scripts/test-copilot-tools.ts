/**
 * Script to test Copilot provider WITH TOOLS to capture agent thoughts/rationale
 *
 * Based on the analysis, the visible "Evaluating Tool Usage" reasoning in the
 * Copilot UI is NOT decrypted from reasoning_opaque - it's plaintext agent
 * thoughts sent when tools are present in the request.
 *
 * This script will:
 * 1. Authenticate with GitHub Copilot
 * 2. Make a request WITH tool definitions
 * 3. Look for agent thoughts/rationale in the response
 * 4. Log everything to a file for analysis
 *
 * Usage:
 *   npx tsx scripts/test-copilot-tools.ts [model]
 *
 * Examples:
 *   npx tsx scripts/test-copilot-tools.ts oswe-vscode-prime
 *   npx tsx scripts/test-copilot-tools.ts gpt-4.1
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

// Tool definitions that should trigger agent thoughts/rationale
const TOOL_DEFINITIONS = [
	{
		type: "function",
		function: {
			name: "calculator",
			description: "Perform mathematical calculations. Use this for any math operations.",
			parameters: {
				type: "object",
				properties: {
					expression: {
						type: "string",
						description: "The mathematical expression to evaluate, e.g. '15 + 27' or 'sqrt(16)'",
					},
				},
				required: ["expression"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_workspace",
			description: "Search for files and code in the current workspace",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "The search query",
					},
					file_pattern: {
						type: "string",
						description: "Optional file pattern to filter results (e.g., '*.ts')",
					},
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "read_file",
			description: "Read the contents of a file from the workspace",
			parameters: {
				type: "object",
				properties: {
					path: {
						type: "string",
						description: "The path to the file to read",
					},
				},
				required: ["path"],
			},
		},
	},
]

// Prompts designed to encourage tool usage and reasoning
const TOOL_PROMPTS = [
	"What is the sum of 15 + 27? Please think through this step by step and explain your reasoning.",
	"Use the calculator to compute 15 + 27. Think through your approach.",
	"I need you to calculate 15 + 27. Please evaluate whether to use the calculator tool for this task.",
]

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	bold: "\x1b[1m",
}

function log(message: string, color?: keyof typeof colors) {
	const colorCode = color ? colors[color] : ""
	console.log(`${colorCode}${message}${colors.reset}`)
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
	} catch {
		// Directory might already exist
	}
}

interface StoredTokens {
	access_token?: string
	api_key?: string
	api_key_expires_at?: number
	api_base?: string
}

async function loadStoredTokens(): Promise<StoredTokens> {
	const tokenPath = join(homedir(), ".copilot-test-tokens.json")
	try {
		const data = await fs.readFile(tokenPath, "utf-8")
		return JSON.parse(data)
	} catch {
		return {}
	}
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
	const tokenPath = join(homedir(), ".copilot-test-tokens.json")
	await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2))
}

interface CopilotTokenResponse {
	token: string
	expires_at: number
	endpoints?: {
		api?: string
	}
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

async function authenticateWithDeviceCode(): Promise<string> {
	log("Starting GitHub Device Code authentication...", "cyan")

	const deviceResponse = await fetch(GITHUB_DEVICE_CODE_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			scope: "read:user",
		}),
	})

	if (!deviceResponse.ok) {
		throw new Error(`Failed to get device code: ${deviceResponse.statusText}`)
	}

	const deviceData = (await deviceResponse.json()) as {
		device_code: string
		user_code: string
		verification_uri: string
		expires_in: number
		interval: number
	}

	log(`\n${"=".repeat(50)}`, "yellow")
	log("  Please visit: " + deviceData.verification_uri, "bold")
	log("  And enter code: " + deviceData.user_code, "bold")
	log(`${"=".repeat(50)}\n`, "yellow")

	const startTime = Date.now()
	const expiresIn = deviceData.expires_in * 1000

	while (Date.now() - startTime < expiresIn) {
		await new Promise((resolve) => setTimeout(resolve, deviceData.interval * 1000))

		const tokenResponse = await fetch(GITHUB_ACCESS_TOKEN_URL, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				device_code: deviceData.device_code,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			}),
		})

		const tokenData = (await tokenResponse.json()) as {
			access_token?: string
			error?: string
		}

		if (tokenData.access_token) {
			log("Authentication successful!", "green")
			return tokenData.access_token
		}

		if (tokenData.error && tokenData.error !== "authorization_pending") {
			throw new Error(`Authentication failed: ${tokenData.error}`)
		}
	}

	throw new Error("Authentication timed out")
}

async function getApiKey(): Promise<{ apiKey: string; apiBase?: string }> {
	try {
		const stored = await loadStoredTokens()

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
			} catch {
				log("Failed to refresh API key, starting new authentication", "yellow")
			}
		}

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

interface ChatCompletionRequestWithTools {
	model: string
	messages: Array<{
		role: string
		content: string
	}>
	tools?: Array<{
		type: string
		function: {
			name: string
			description: string
			parameters: object
		}
	}>
	tool_choice?: string | object
	max_tokens?: number
	temperature?: number
	stream?: boolean
}

// Function to recursively find all reasoning/thinking related fields
function findReasoningFields(obj: unknown, path: string = ""): Array<{ path: string; value: unknown }> {
	const results: Array<{ path: string; value: unknown }> = []

	if (obj === null || obj === undefined) return results

	if (typeof obj === "object") {
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			const currentPath = path ? `${path}.${key}` : key

			// Check for reasoning-related field names
			const isReasoningField = /reason|think|thought|rationale|cot|opaque|agent|explain/i.test(key)

			if (isReasoningField && value !== null && value !== undefined) {
				results.push({ path: currentPath, value })
			}

			// Recurse into nested objects and arrays
			if (typeof value === "object" && value !== null) {
				results.push(...findReasoningFields(value, currentPath))
			}
		}
	}

	return results
}

async function testWithTools(
	apiKey: string,
	apiBase: string,
	modelId: string,
	prompt: string,
	useTools: boolean = true,
): Promise<{
	success: boolean
	rawResponse: unknown
	streamChunks?: unknown[]
	fullContent?: string
	toolCalls?: unknown[]
	reasoningFields?: Array<{ path: string; value: unknown }>
	error?: string
}> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE
	const chatUrl = `${baseURL.replace(/\/$/, "")}/chat/completions`

	log(`\nTesting model: ${modelId}`, "magenta")
	log(`Endpoint: ${chatUrl}`, "blue")
	log(`Tools: ${useTools ? "ENABLED" : "disabled"}`, useTools ? "green" : "yellow")
	log(`Prompt: "${prompt}"`, "cyan")

	const requestBody: ChatCompletionRequestWithTools = {
		model: modelId,
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
		max_tokens: 4000,
		temperature: 0.7,
		stream: true,
	}

	// Add tools if enabled
	if (useTools) {
		requestBody.tools = TOOL_DEFINITIONS
		requestBody.tool_choice = "auto"
	}

	log(`\nRequest body:`, "blue")
	log(JSON.stringify(requestBody, null, 2), "cyan")

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

		// Handle streaming response
		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error("No response body reader available")
		}

		const decoder = new TextDecoder()
		const chunks: unknown[] = []
		let fullContent = ""
		const toolCalls: unknown[] = []
		let allReasoningFields: Array<{ path: string; value: unknown }> = []
		let buffer = ""

		log("\n  Streaming response:", "green")
		console.log()

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
						const chunk = JSON.parse(jsonStr)
						chunks.push(chunk)

						// Find all reasoning-related fields in this chunk
						const reasoningInChunk = findReasoningFields(chunk)
						if (reasoningInChunk.length > 0) {
							for (const rf of reasoningInChunk) {
								log(`\n  🧠 [REASONING FIELD - ${rf.path}]:`, "yellow")
								log(
									`     ${typeof rf.value === "string" ? rf.value : JSON.stringify(rf.value)}`,
									"cyan",
								)
							}
							allReasoningFields.push(...reasoningInChunk)
						}

						// Extract content
						const delta = chunk.choices?.[0]?.delta
						if (delta) {
							if (delta.content) {
								fullContent += delta.content
								process.stdout.write(delta.content)
							}

							// Check for tool calls
							if (delta.tool_calls) {
								log(`\n  🔧 [TOOL CALLS]:`, "magenta")
								log(`     ${JSON.stringify(delta.tool_calls)}`, "cyan")
								toolCalls.push(...delta.tool_calls)
							}

							// Log ALL fields in delta for investigation
							for (const [key, value] of Object.entries(delta)) {
								if (key !== "content" && key !== "role" && value !== null && value !== undefined) {
									log(`\n  📋 [Delta Field - ${key}]: ${JSON.stringify(value)}`, "blue")
								}
							}
						}

						// Log any top-level fields that might contain agent thoughts
						const topLevelIgnore = new Set([
							"id",
							"object",
							"created",
							"model",
							"choices",
							"usage",
							"system_fingerprint",
						])
						for (const [key, value] of Object.entries(chunk)) {
							if (!topLevelIgnore.has(key) && value !== null && value !== undefined) {
								log(`\n  📋 [Top-Level Field - ${key}]: ${JSON.stringify(value).slice(0, 200)}`, "blue")
							}
						}
					} catch (e) {
						// Parse error, skip
					}
				}
			}
		}

		console.log("\n")
		log(`\n  Full content length: ${fullContent.length} chars`, "green")
		log(`  Total chunks: ${chunks.length}`, "green")
		log(`  Tool calls found: ${toolCalls.length}`, toolCalls.length > 0 ? "green" : "yellow")
		log(
			`  Reasoning fields found: ${allReasoningFields.length}`,
			allReasoningFields.length > 0 ? "green" : "yellow",
		)

		return {
			success: true,
			rawResponse: chunks,
			streamChunks: chunks,
			fullContent,
			toolCalls,
			reasoningFields: allReasoningFields,
		}
	} catch (error) {
		log(`  ❌ Error: ${error}`, "red")
		return {
			success: false,
			rawResponse: null,
			error: String(error),
		}
	}
}

async function main() {
	logSection("Copilot Tools + Agent Thoughts Test Script")

	const modelArg = process.argv[2] || "oswe-vscode-prime"
	const promptIndex = parseInt(process.argv[3] || "0", 10)
	const prompt = TOOL_PROMPTS[promptIndex] || TOOL_PROMPTS[0]

	log(`Model: ${modelArg}`, "bold")
	log(`Prompt: ${prompt}`, "bold")
	console.log()

	// Authenticate
	logSection("Authentication")
	const { apiKey, apiBase: rawApiBase } = await getApiKey()
	const apiBase = rawApiBase || GITHUB_COPILOT_API_BASE
	log(`API Base: ${apiBase}`, "blue")

	const allResults: unknown[] = []

	// Test WITH tools
	logSection(`Testing ${modelArg} WITH Tools`)
	const resultWithTools = await testWithTools(apiKey, apiBase, modelArg, prompt, true)
	allResults.push({
		timestamp: new Date().toISOString(),
		model: modelArg,
		prompt,
		withTools: true,
		result: resultWithTools,
	})

	// Test WITHOUT tools for comparison
	logSection(`Testing ${modelArg} WITHOUT Tools (comparison)`)
	const resultWithoutTools = await testWithTools(apiKey, apiBase, modelArg, prompt, false)
	allResults.push({
		timestamp: new Date().toISOString(),
		model: modelArg,
		prompt,
		withTools: false,
		result: resultWithoutTools,
	})

	// Save results
	const outputDir = join(__dirname, "output")
	await ensureDir(outputDir)
	const timestamp = Date.now()
	const outputPath = join(outputDir, `copilot-tools-${timestamp}.json`)
	await fs.writeFile(outputPath, JSON.stringify(allResults, null, 2))

	log(`\nOutput saved to: ${outputPath}`, "green")

	// Summary
	logSection("Summary")
	log(`\nWith Tools:`, "bold")
	log(`  - Success: ${resultWithTools.success ? "✅" : "❌"}`)
	log(`  - Tool calls: ${resultWithTools.toolCalls?.length || 0}`)
	log(`  - Reasoning fields: ${resultWithTools.reasoningFields?.length || 0}`)

	log(`\nWithout Tools:`, "bold")
	log(`  - Success: ${resultWithoutTools.success ? "✅" : "❌"}`)
	log(`  - Reasoning fields: ${resultWithoutTools.reasoningFields?.length || 0}`)

	if ((resultWithTools.reasoningFields?.length || 0) > (resultWithoutTools.reasoningFields?.length || 0)) {
		log(`\n✅ Adding tools resulted in MORE reasoning fields!`, "green")
	} else {
		log(`\n⚠️  No additional reasoning fields with tools`, "yellow")
	}
}

main().catch(console.error)
