/**
 * Test script to verify Copilot reasoning integration in Kilo Code
 *
 * This script tests:
 * 1. Sending requests with reasoning_effort parameter
 * 2. Capturing reasoning_text from the response
 * 3. Processing reasoning tokens in usage metrics
 */

import * as https from "https"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// Copilot configuration
const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code"
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
const GITHUB_API_KEY_URL = "https://api.github.com/copilot_internal/v2/token"
const GITHUB_COPILOT_API_BASE = "https://api.githubcopilot.com"

const COPILOT_DEFAULT_HEADER = {
	accept: "application/json",
	"content-type": "application/json",
	"editor-version": "vscode/1.85.1",
	"editor-plugin-version": "copilot/1.155.0",
	"user-agent": "GithubCopilot/1.155.0",
	"accept-encoding": "gzip,deflate,br",
}

// Token storage path - use the same location as Kilo Code's CopilotAuthenticator
const TOKEN_STORAGE_DIR = path.join(os.homedir(), ".roo-code", "copilot")
const TOKEN_STORAGE_PATH = path.join(TOKEN_STORAGE_DIR, "tokens.json")

// Interface matching the CopilotAuthenticator's stored token format
interface StoredTokenData {
	access_token: string
	api_key?: string
	api_key_expires_at?: number
	api_base?: string
}

// Test configurations
interface TestConfig {
	model: string
	reasoningEffort?: "low" | "medium" | "high"
	prompt: string
}

const testConfigs: TestConfig[] = [
	// Test oswe-vscode-prime (known to support reasoning)
	{
		model: "oswe-vscode-prime",
		prompt: "What is 2 + 2? Explain your reasoning step by step.",
	},
	{
		model: "oswe-vscode-prime",
		reasoningEffort: "low",
		prompt: "What is 2 + 2? Explain your reasoning step by step.",
	},
	{
		model: "oswe-vscode-prime",
		reasoningEffort: "medium",
		prompt: "What is 15 * 23? Explain your reasoning step by step.",
	},
	{
		model: "oswe-vscode-prime",
		reasoningEffort: "high",
		prompt: "What is 15 * 23? Explain your reasoning step by step.",
	},
	// Test grok-fast-code-1
	{
		model: "grok-fast-code-1",
		prompt: "What is 2 + 2? Explain your reasoning step by step.",
	},
	{
		model: "grok-fast-code-1",
		reasoningEffort: "medium",
		prompt: "What is 15 * 23? Explain your reasoning step by step.",
	},
	// Test gpt-4o
	{
		model: "gpt-4o",
		prompt: "What is 2 + 2? Explain your reasoning step by step.",
	},
	{
		model: "gpt-4o",
		reasoningEffort: "medium",
		prompt: "What is 15 * 23? Explain your reasoning step by step.",
	},
]

// Helper function for HTTP requests
function httpRequest(url: string, options: https.RequestOptions, body?: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const req = https.request(url, options, (res) => {
			let data = ""
			res.on("data", (chunk) => (data += chunk))
			res.on("end", () => {
				try {
					resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) })
				} catch {
					resolve({ status: res.statusCode, headers: res.headers, data })
				}
			})
		})
		req.on("error", reject)
		if (body) req.write(body)
		req.end()
	})
}

// Get API key from Kilo Code's token storage, or fall back to device code flow
async function getApiKeyFromStorage(): Promise<{ apiKey: string; apiBase?: string } | null> {
	if (!fs.existsSync(TOKEN_STORAGE_PATH)) {
		return null
	}

	try {
		const stored: StoredTokenData = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, "utf-8"))

		// Check if we have a valid API key
		if (stored.api_key && stored.api_key_expires_at) {
			const now = Math.floor(Date.now() / 1000)
			if (stored.api_key_expires_at > now + 60) {
				// 60 second buffer
				console.log("Using cached Copilot API key from Kilo Code storage")
				return {
					apiKey: stored.api_key,
					apiBase: stored.api_base,
				}
			}
		}

		// If we have an access token but the API key is expired, refresh it
		if (stored.access_token) {
			console.log("Refreshing expired Copilot API key...")
			const apiKeyResp = await httpRequest(GITHUB_API_KEY_URL, {
				method: "GET",
				headers: {
					Authorization: `token ${stored.access_token}`,
					accept: "application/json",
				},
			})

			if (apiKeyResp.data.token) {
				const newToken: StoredTokenData = {
					...stored,
					api_key: apiKeyResp.data.token,
					api_key_expires_at: apiKeyResp.data.expires_at,
					api_base: apiKeyResp.data.endpoints?.api,
				}
				fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(newToken, null, 2))
				console.log("API key refreshed and saved!")
				return {
					apiKey: apiKeyResp.data.token,
					apiBase: apiKeyResp.data.endpoints?.api,
				}
			}
		}
	} catch (e) {
		console.log("Failed to read/refresh cached token:", e)
	}

	return null
}

// Device code flow authentication
async function authenticate(): Promise<string> {
	// First, try to get API key from Kilo Code's storage
	const cached = await getApiKeyFromStorage()
	if (cached) {
		return cached.apiKey
	}

	console.log("\n=== GitHub Copilot Authentication ===")
	console.log("No valid cached token found. Starting device code flow...")

	// Step 1: Request device code
	const deviceCodeResp = await httpRequest(
		GITHUB_DEVICE_CODE_URL,
		{
			method: "POST",
			headers: { accept: "application/json", "content-type": "application/json" },
		},
		JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "read:user" }),
	)

	const { device_code, user_code, verification_uri, interval } = deviceCodeResp.data
	console.log(`\nPlease visit: ${verification_uri}`)
	console.log(`And enter code: ${user_code}\n`)

	// Step 2: Poll for access token
	let accessToken = ""
	while (!accessToken) {
		await new Promise((r) => setTimeout(r, (interval + 1) * 1000))

		const tokenResp = await httpRequest(
			GITHUB_ACCESS_TOKEN_URL,
			{
				method: "POST",
				headers: { accept: "application/json", "content-type": "application/json" },
			},
			JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				device_code,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			}),
		)

		if (tokenResp.data.access_token) {
			accessToken = tokenResp.data.access_token
		} else if (tokenResp.data.error === "authorization_pending") {
			process.stdout.write(".")
		} else {
			throw new Error(`Auth failed: ${JSON.stringify(tokenResp.data)}`)
		}
	}

	console.log("\nAccess token obtained!")

	// Step 3: Get Copilot API key
	const apiKeyResp = await httpRequest(GITHUB_API_KEY_URL, {
		method: "GET",
		headers: {
			Authorization: `token ${accessToken}`,
			accept: "application/json",
		},
	})

	const { token: apiKey, expires_at, endpoints } = apiKeyResp.data

	// Save the token in Kilo Code's format
	if (!fs.existsSync(TOKEN_STORAGE_DIR)) {
		fs.mkdirSync(TOKEN_STORAGE_DIR, { recursive: true })
	}

	const tokenData: StoredTokenData = {
		access_token: accessToken,
		api_key: apiKey,
		api_key_expires_at: expires_at,
		api_base: endpoints?.api,
	}
	fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(tokenData, null, 2))

	console.log("Copilot API key obtained and cached in Kilo Code's storage!")
	return apiKey
}

// Make a streaming chat completion request
async function testChatCompletion(apiKey: string, config: TestConfig): Promise<any> {
	const url = new URL("/chat/completions", GITHUB_COPILOT_API_BASE)

	const requestBody: any = {
		model: config.model,
		messages: [{ role: "user", content: config.prompt }],
		stream: true,
		stream_options: { include_usage: true },
	}

	// Add reasoning effort if specified
	if (config.reasoningEffort) {
		requestBody.reasoning_effort = config.reasoningEffort
	}

	return new Promise((resolve, reject) => {
		const req = https.request(
			url,
			{
				method: "POST",
				headers: {
					...COPILOT_DEFAULT_HEADER,
					Authorization: `Bearer ${apiKey}`,
					"X-Initiator": "user",
				},
			},
			(res) => {
				let buffer = ""
				const result: any = {
					config,
					status: res.statusCode,
					chunks: [],
					content: "",
					reasoningText: "",
					reasoningOpaque: "",
					usage: null,
				}

				res.on("data", (chunk) => {
					buffer += chunk.toString()
					const lines = buffer.split("\n")
					buffer = lines.pop() || ""

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							const data = line.slice(6).trim()
							if (data === "[DONE]") continue

							try {
								const parsed = JSON.parse(data)
								result.chunks.push(parsed)

								const delta = parsed.choices?.[0]?.delta
								if (delta) {
									// Capture reasoning text
									if (delta.reasoning_text) {
										result.reasoningText += delta.reasoning_text
									}
									// Capture reasoning opaque
									if (delta.reasoning_opaque) {
										result.reasoningOpaque += delta.reasoning_opaque
									}
									// Capture content
									if (delta.content) {
										result.content += delta.content
									}
								}

								// Capture usage
								if (parsed.usage) {
									result.usage = parsed.usage
								}
							} catch (e) {
								// Ignore parse errors
							}
						}
					}
				})

				res.on("end", () => resolve(result))
				res.on("error", reject)
			},
		)

		req.on("error", reject)
		req.write(JSON.stringify(requestBody))
		req.end()
	})
}

// Main test function
async function main() {
	console.log("=== Copilot Reasoning Integration Test ===\n")

	try {
		// Authenticate
		const apiKey = await authenticate()

		// Run tests
		const results: any[] = []

		for (const config of testConfigs) {
			console.log(`\nTesting model: ${config.model}, reasoning_effort: ${config.reasoningEffort || "none"}`)
			console.log("-".repeat(60))

			const result = await testChatCompletion(apiKey, config)
			results.push(result)

			console.log(`Status: ${result.status}`)
			console.log(`Content length: ${result.content.length} chars`)
			console.log(`Reasoning text length: ${result.reasoningText.length} chars`)
			console.log(`Reasoning opaque length: ${result.reasoningOpaque.length} chars`)

			if (result.usage) {
				console.log(`Usage: prompt=${result.usage.prompt_tokens}, completion=${result.usage.completion_tokens}`)
				if (result.usage.completion_tokens_details?.reasoning_tokens) {
					console.log(`  Reasoning tokens: ${result.usage.completion_tokens_details.reasoning_tokens}`)
				}
			}

			// Show a snippet of the content
			if (result.content) {
				console.log(`\nContent (first 200 chars): ${result.content.substring(0, 200)}...`)
			}

			// Show a snippet of reasoning text if present
			if (result.reasoningText) {
				console.log(`\nReasoning text (first 200 chars): ${result.reasoningText.substring(0, 200)}...`)
			}
		}

		// Save results to file
		const outputDir = path.join(__dirname, "output")
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true })
		}

		const outputPath = path.join(outputDir, `copilot-reasoning-integration-${Date.now()}.json`)
		fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
		console.log(`\n\nResults saved to: ${outputPath}`)

		// Summary
		console.log("\n=== Summary ===")
		for (const result of results) {
			const hasReasoning = result.reasoningText.length > 0 || result.reasoningOpaque.length > 0
			console.log(
				`Model: ${result.config.model}, Effort: ${result.config.reasoningEffort || "none"} => ` +
					`Content: ${result.content.length} chars, ` +
					`Reasoning: ${hasReasoning ? "YES" : "NO"} ` +
					`(text: ${result.reasoningText.length}, opaque: ${result.reasoningOpaque.length})`,
			)
		}
	} catch (error) {
		console.error("Error:", error)
		process.exit(1)
	}
}

main()
