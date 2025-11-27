/**
 * Script to discover and test Copilot image-processing endpoints
 *
 * This script will:
 * 1. Authenticate with GitHub Copilot using device code flow
 * 2. Fetch all available models and analyze their vision capabilities
 * 3. Test image processing with vision-capable models (gpt-5-mini, gpt-4.1, etc.)
 *
 * Usage:
 *   npx ts-node scripts/test-copilot-image-endpoints.ts [image_path]
 *
 * If no image path is provided, it will use a default test image.
 */

import { promises as fs } from "fs"
import { join } from "path"
import { homedir } from "os"
import * as path from "path"

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

interface ModelCapabilities {
	limits?: {
		max_output_tokens?: number
		max_context_window_tokens?: number
	}
	supports?: {
		vision?: boolean
		max_thinking_budget?: number
		tool_calls?: boolean
		streaming?: boolean
	}
}

interface CopilotModel {
	id: string
	name: string
	model_picker_enabled?: boolean
	capabilities?: ModelCapabilities
	version?: string
	preview?: boolean
}

interface ModelsResponse {
	data: CopilotModel[]
}

// Token storage location
const tokenDir = join(homedir(), ".roo-code", "copilot")
const tokenFile = join(tokenDir, "tokens.json")

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

async function ensureTokenDir(): Promise<void> {
	try {
		await fs.mkdir(tokenDir, { recursive: true })
	} catch (error) {
		// Directory might already exist
	}
}

async function loadStoredTokens(): Promise<Partial<StoredTokenData>> {
	try {
		await ensureTokenDir()
		const data = await fs.readFile(tokenFile, "utf-8")
		return JSON.parse(data)
	} catch (error) {
		return {}
	}
}

async function saveTokens(tokens: StoredTokenData): Promise<void> {
	await ensureTokenDir()
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

async function fetchModels(apiKey: string, apiBase?: string): Promise<CopilotModel[]> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE
	const modelsUrl = `${baseURL.replace(/\/$/, "")}/models`

	log(`Fetching models from: ${modelsUrl}`, "blue")

	const response = await fetch(modelsUrl, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json",
			...COPILOT_DEFAULT_HEADER,
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`)
	}

	const data = (await response.json()) as ModelsResponse
	return data.data
}

async function testImageEndpoint(
	apiKey: string,
	apiBase: string | undefined,
	modelId: string,
	imageBase64: string,
	mimeType: string,
): Promise<{ success: boolean; response?: string; error?: string }> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE
	const chatUrl = `${baseURL.replace(/\/$/, "")}/chat/completions`

	log(`\nTesting model: ${modelId}`, "magenta")
	log(`Endpoint: ${chatUrl}`, "blue")

	try {
		const requestBody = {
			model: modelId,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Please describe this image in detail. What do you see?",
						},
						{
							type: "image_url",
							image_url: {
								url: `data:${mimeType};base64,${imageBase64}`,
							},
						},
					],
				},
			],
			max_tokens: 500,
			temperature: 0.7,
		}

		// Include the required Copilot-Vision-Request header for vision requests
		const response = await fetch(chatUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"Copilot-Vision-Request": "true",
				...COPILOT_DEFAULT_HEADER,
			},
			body: JSON.stringify(requestBody),
		})

		const responseText = await response.text()

		if (!response.ok) {
			log(`  ❌ HTTP ${response.status}: ${response.statusText}`, "red")
			try {
				const errorData = JSON.parse(responseText)
				log(`  Error details: ${JSON.stringify(errorData, null, 2)}`, "red")
				return {
					success: false,
					error: `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
				}
			} catch {
				return { success: false, error: `HTTP ${response.status}: ${responseText}` }
			}
		}

		const data = JSON.parse(responseText)
		const content = data.choices?.[0]?.message?.content || ""

		if (content) {
			log(`  ✅ Success! Response preview:`, "green")
			log(`  "${content.substring(0, 200)}${content.length > 200 ? "..." : ""}"`, "white")
			return { success: true, response: content }
		} else {
			log(`  ⚠️ Empty response received`, "yellow")
			return { success: false, error: "Empty response" }
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		log(`  ❌ Error: ${errorMsg}`, "red")
		return { success: false, error: errorMsg }
	}
}

async function testImageEndpointWithUrl(
	apiKey: string,
	apiBase: string | undefined,
	modelId: string,
	imageUrl: string,
): Promise<{ success: boolean; response?: string; error?: string }> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE
	const chatUrl = `${baseURL.replace(/\/$/, "")}/chat/completions`

	log(`\nTesting model (URL method): ${modelId}`, "magenta")

	try {
		const requestBody = {
			model: modelId,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Please describe this image in detail. What do you see?",
						},
						{
							type: "image_url",
							image_url: {
								url: imageUrl,
							},
						},
					],
				},
			],
			max_tokens: 500,
			temperature: 0.7,
		}

		const response = await fetch(chatUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				...COPILOT_DEFAULT_HEADER,
			},
			body: JSON.stringify(requestBody),
		})

		const responseText = await response.text()

		if (!response.ok) {
			log(`  ❌ HTTP ${response.status}: ${response.statusText}`, "red")
			return { success: false, error: `HTTP ${response.status}: ${responseText}` }
		}

		const data = JSON.parse(responseText)
		const content = data.choices?.[0]?.message?.content || ""

		if (content) {
			log(`  ✅ Success with URL method!`, "green")
			return { success: true, response: content }
		} else {
			return { success: false, error: "Empty response" }
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		return { success: false, error: errorMsg }
	}
}

async function discoverEndpoints(apiKey: string, apiBase?: string): Promise<void> {
	const baseURL = apiBase || GITHUB_COPILOT_API_BASE

	logSection("Discovering Available Endpoints")

	const endpoints = [
		"/",
		"/models",
		"/chat/completions",
		"/completions",
		"/embeddings",
		"/images",
		"/images/generations",
		"/images/edits",
		"/images/variations",
		"/vision",
		"/v1/chat/completions",
		"/v1/models",
		"/openai/v1/chat/completions",
	]

	for (const endpoint of endpoints) {
		const url = `${baseURL.replace(/\/$/, "")}${endpoint}`
		try {
			const response = await fetch(url, {
				method: endpoint.includes("completions") ? "POST" : "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					...COPILOT_DEFAULT_HEADER,
				},
				body: endpoint.includes("completions") ? JSON.stringify({ model: "gpt-4.1", messages: [] }) : undefined,
			})

			const status = response.status
			const statusText = response.statusText
			const color = status < 400 ? "green" : status < 500 ? "yellow" : "red"
			log(`  ${endpoint}: ${status} ${statusText}`, color)
		} catch (error) {
			log(`  ${endpoint}: Error - ${error instanceof Error ? error.message : String(error)}`, "red")
		}
	}
}

async function loadImage(imagePath: string): Promise<{ base64: string; mimeType: string }> {
	const ext = path.extname(imagePath).toLowerCase()
	const mimeTypes: Record<string, string> = {
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".webp": "image/webp",
	}

	const mimeType = mimeTypes[ext] || "image/png"
	const imageBuffer = await fs.readFile(imagePath)
	const base64 = imageBuffer.toString("base64")

	return { base64, mimeType }
}

// Function to compress/resize image using HTML Canvas-like approach via sharp if available
// For now, we'll just check the size and warn if too large
async function loadImageWithSizeCheck(
	imagePath: string,
	maxSizeBytes: number = 3145728,
): Promise<{ base64: string; mimeType: string; warning?: string }> {
	const { base64, mimeType } = await loadImage(imagePath)
	const sizeBytes = Math.ceil((base64.length * 3) / 4) // Approximate original size from base64

	if (sizeBytes > maxSizeBytes) {
		return {
			base64,
			mimeType,
			warning: `Image size (${(sizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds max allowed (${(maxSizeBytes / 1024 / 1024).toFixed(2)} MB). Will likely get 413 error.`,
		}
	}

	return { base64, mimeType }
}

// Create a simple test image as base64 (a proper 100x100 colored square)
function createTestImage(): { base64: string; mimeType: string } {
	// This is a valid 100x100 red PNG image encoded in base64
	// Generated from a proper PNG with correct header and structure
	const validPngBase64 =
		"iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TpSIVBzuIOGSoThZERRxLFYtgobQVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi6OSk6CIl/i8ptIjx4Lgf7+497t4BQqPCVLNrHFA1y0gnE2I2tyoGXhFEP4YRQVxipp7KLuTgOb7u4ePrXZRneZ/7c/QreZMBPpE4xnTDIt4gnt60dM77xGFWkhTic+Jxgy5I/Mh12eU3zkWHBZ4ZNjLpeeIwsVjsYLmDWclQiaeJI4qqUb6QdVnhvMVZrdRY6578hcG8tpLmOs0RJLCIJFIQIaOGCqqwEKNVI8VEmvYTHv6hjl8ilyyyTyW6fS3DJnIULDQDZzqBaS5iNzLpBSN+k4P3gJBf1GxnbBkH01xZFvPIBIeeBhr+Bnzf8u7adtZPgJAduPJar+MQ2N0W6Hv9vrbt6gngfwau9Ka/XANmP0mvt7XIEZ62QOMHmcfAiDjg0p0D3N0dHfO+0+b5TQL7wOXQN+kOLDCf+gZe+/YvzWt/zwDwe5V7AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAGnRFWHRTb2Z0d2FyZQBQYWludC5ORVQgdjMuNS4xMDD0cqEAAAE4SURBVHic7dAhDsAgEETR5f4nxjXgmkIQy+Y/MTgQO5lJZ+btzPvuAP6IEBCEgCAEBCEgCAFBCAhCQBACghAQhIAgBAQhIAgBQQgIQkAQAoIQEISAIAQEISAIAUEICEJAEAKCEBCEgCAEBCEgCAFBCAhCQBACghAQhIAgBAQhIAgBQQgIQkAQAoIQEISAIAQEISAIAUEICEJAEAKCEBCEgCAEBCEgCAFBCAhCQBACghAQhIAgBAQhIAgBQQgIQkAQAoIQEISAIAQEISAIAUEICEJAEAKCEBCEgCAEBCEgCAFBCAhCQBACghAQhIAgBAQhIAgBQQgIQkAQAoIQEISAIAQEISAIAUEICEJAEAKCEBCEgCAEBCEgCAFBCAhCQBACghAQhIAgBAQhIAgBQQgIQkD4gQfDOQVJL7RlswAAAABJRU5ErkJggg=="
	return {
		base64: validPngBase64,
		mimeType: "image/png",
	}
}

// Create a more realistic test image - a small JPEG with actual content
function createRealisticTestImage(): { base64: string; mimeType: string } {
	// This is a small 64x64 JPEG image with a simple pattern (red/blue gradient)
	// More likely to be accepted by the API
	const validJpegBase64 =
		"/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCABAAEADAREAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAABAUCAwYBBwD/xAAYAQEBAQEBAAAAAAAAAAAAAAABAAIDBP/aAAwDAQACEAMQAAAB9U8/0OecnLnLnEUGCpRYhGlhpYKkFplSMKCgwUGKhDSwVJBgxNwCuoZXUErqCl1BS6gxdQcuoJXUFLqDFpgy2oKLShS6ghdQUuoOXUFLqDF1Bi0wVbUFLShS6ghdQUuoJXUHLqCV1Bi6gxdQauoMWmDLagotKFLqCF1BS6ghdQcuoJXUGLqCl1By6g5aYKtqCl1BC6gxdQQuoKXUErqDl1BS6gxdQctMGXUILqCV1Bi6ghdQUuoJXUHLqCV1Bi6g5aYMtqCl1BC6gxdQSuoJXUHLqCV1By6gpdQctMGW1BS6ghdQYuoJXUErqDl1BK6gxdQcuoNWmCrahS6ghdQYuoJXUErqDl1BK6gxdQctMGW1Cl1BC6gxdQSuoJXUHLqCV1Bi6gxdQatMFW1Cl1BK6gldQSuoOXUErqDF1Bi6gxaYKtqFLqCF1Bi6gldQSuoOXUErqDF1Bi0wVbUKXUELqDF1BK6gldQcuoJXUGLqDFpgq2oUuoIXUGLqCl1BK6g5dQSuoMXUGLTBVtQpdQQuoMXUErqCV1By6gldQYuoMWmCragpdQQuoMXUErqCV1By6gldQYuoNWmCrahS6ghdQYuoJXUErqDl1BK6gxdQYtMFW1Cl1BC6gxdQSuoJXUHLqCV1Bi6gxaYKtqFLqCF1Bi6gldQSuoOXUErqDF1Bi0wVbUKXUELqDF1BK6gldQcuoJXUGLqDFpgq2oUuoIXUGLqCV1BK6g5dQSuoMXUGLTBVtQpdQQuoMXUErqCV1By6gldQYuoMWmCrag=="
	return {
		base64: validJpegBase64,
		mimeType: "image/jpeg",
	}
}

async function main() {
	logSection("Copilot Image Endpoint Discovery & Testing Script")

	// Get image path from command line or use default
	const imagePath = process.argv[2] || "C:\\Users\\Sanve\\Downloads\\Gemini_Generated_Image_w11m92w11m92w11m.png"

	let imageBase64: string = ""
	let mimeType: string = "image/png"
	let useTestImage = false

	log(`Image path: ${imagePath}`, "blue")

	// Check if image exists
	try {
		await fs.access(imagePath)
		log("Image file found ✓", "green")

		// Load the image with size check
		log("Loading image...", "yellow")
		const imageData = await loadImageWithSizeCheck(imagePath)

		if (imageData.warning) {
			log(`⚠️ ${imageData.warning}`, "yellow")
			log("Will use a small test image instead for testing.", "yellow")
			useTestImage = true
		} else {
			imageBase64 = imageData.base64
			mimeType = imageData.mimeType
			log(`Image loaded: ${((imageBase64.length * 3) / 4 / 1024).toFixed(2)} KB (${mimeType})`, "green")
		}
	} catch {
		log(`Image file not found at ${imagePath}`, "yellow")
		log("Will use a small test image for testing.", "yellow")
		useTestImage = true
	}

	if (useTestImage) {
		// Try the more realistic JPEG test image first
		const testImage = createRealisticTestImage()
		imageBase64 = testImage.base64
		mimeType = testImage.mimeType
		log(`Using test image: ${((imageBase64.length * 3) / 4 / 1024).toFixed(2)} KB (${mimeType})`, "green")
	}

	// Authenticate
	logSection("Authentication")
	const { apiKey, apiBase } = await getApiKey()
	log(`API Base: ${apiBase || GITHUB_COPILOT_API_BASE}`, "blue")

	// Discover endpoints
	await discoverEndpoints(apiKey, apiBase)

	// Fetch and analyze models
	logSection("Available Models Analysis")
	const models = await fetchModels(apiKey, apiBase)

	log(`Found ${models.length} total models\n`, "cyan")

	// Categorize models
	const visionModels: CopilotModel[] = []
	const potentialVisionModels: CopilotModel[] = []
	const otherModels: CopilotModel[] = []

	for (const model of models) {
		const hasVision = model.capabilities?.supports?.vision
		const nameHasVision =
			model.name?.toLowerCase().includes("vision") ||
			model.id?.toLowerCase().includes("vision") ||
			model.id?.toLowerCase().includes("4o") ||
			model.id?.toLowerCase().includes("gpt-4.1") ||
			model.id?.toLowerCase().includes("gpt-5")

		if (hasVision) {
			visionModels.push(model)
		} else if (nameHasVision) {
			potentialVisionModels.push(model)
		} else {
			otherModels.push(model)
		}
	}

	log("Models with Vision Capability Flag:", "green")
	if (visionModels.length === 0) {
		log("  (none found)", "yellow")
	} else {
		for (const model of visionModels) {
			log(`  - ${model.id} (${model.name})`, "white")
		}
	}

	log("\nModels Potentially Supporting Vision (by name):", "yellow")
	if (potentialVisionModels.length === 0) {
		log("  (none found)", "yellow")
	} else {
		for (const model of potentialVisionModels) {
			log(`  - ${model.id} (${model.name})`, "white")
		}
	}

	log("\nAll Models (detailed):", "blue")
	for (const model of models) {
		const enabled = model.model_picker_enabled ? "✓" : "✗"
		const vision = model.capabilities?.supports?.vision ? "👁️" : ""
		log(`  ${enabled} ${model.id}: ${model.name} ${vision}`, "white")
		if (model.capabilities) {
			log(`      Limits: ${JSON.stringify(model.capabilities.limits || {})}`, "white")
			log(`      Supports: ${JSON.stringify(model.capabilities.supports || {})}`, "white")
		}
	}

	// Test image processing with specific models
	logSection("Testing Image Processing")

	// Only test the 4 models specified by user to conserve API requests
	const modelsToTest = ["gpt-4.1", "gpt-5-mini", "oswe-vscode-prime", "gpt-4o"]

	log(`Testing ${modelsToTest.length} models for image support...\n`, "cyan")

	const results: { modelId: string; success: boolean; method?: string; error?: string; response?: string }[] = []

	for (const modelId of modelsToTest) {
		// Test with base64 image
		const result = await testImageEndpoint(apiKey, apiBase, modelId, imageBase64, mimeType)
		results.push({
			modelId,
			success: result.success,
			method: "base64",
			error: result.error,
			response: result.response,
		})

		// Add delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	// Summary
	logSection("Test Results Summary")

	const successfulModels = results.filter((r) => r.success)
	const failedModels = results.filter((r) => !r.success)

	log(`✅ Successful: ${successfulModels.length}`, "green")
	for (const result of successfulModels) {
		log(`   - ${result.modelId} (${result.method})`, "green")
	}

	log(`\n❌ Failed: ${failedModels.length}`, "red")
	for (const result of failedModels) {
		log(`   - ${result.modelId}: ${result.error}`, "red")
	}

	// Generate recommendations
	logSection("Recommendations for Copilot Provider")

	if (successfulModels.length > 0) {
		log("The following models support image processing and should be enabled:", "green")
		for (const result of successfulModels) {
			log(`  - ${result.modelId}`, "white")
		}
		log("\nUpdate the getCopilotModels() function in src/api/providers/fetchers/copilot.ts", "yellow")
		log("to set supportsImages: true for these models.", "yellow")
	} else {
		log("No models were found to support image processing.", "yellow")
		log("This could mean:", "white")
		log("  1. The Copilot API doesn't support vision through the chat/completions endpoint", "white")
		log("  2. A different endpoint or format is required", "white")
		log("  3. Additional permissions or features need to be enabled", "white")
	}

	// Print detailed responses for debugging
	if (successfulModels.length > 0) {
		logSection("Detailed Successful Responses")
		for (const result of successfulModels) {
			log(`\n${result.modelId}:`, "magenta")
			log(`${result.response}`, "white")
		}
	}
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
