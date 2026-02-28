// kilocode_change - new file
// Antigravity provider: wraps @ai-sdk/google with a custom fetch that routes
// through the Antigravity (Cloud Code) SSE endpoint.

import { Auth } from "@/auth"
import { Log } from "@/util/log"
import {
  ANTIGRAVITY_BASE_URL,
  ANTIGRAVITY_STREAM_ENDPOINT,
  ANTIGRAVITY_USER_AGENT,
  ANTIGRAVITY_SAFETY_SETTINGS,
  ANTIGRAVITY_THINKING_BUDGETS,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
} from "./const"

const log = Log.create({ service: "antigravity" })

/** Dummy base URL that the custom fetch will intercept. */
export const PROXY_BASE = "https://antigravity-proxy.internal/v1beta"

interface AntigravityOptions {
  accessToken: string
  refreshToken?: string
  projectId?: string
}

export async function refreshAccessToken(token: string): Promise<{ access: string; refresh?: string; expires: number }> {
  const params = new URLSearchParams({
    refresh_token: token,
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
    grant_type: "refresh_token",
  })
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Antigravity token refresh failed: ${response.status} - ${text}`)
  }
  const data = (await response.json()) as Record<string, unknown>
  return {
    access: data.access_token as string,
    expires: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
    refresh: (data.refresh_token as string) ?? undefined,
  }
}

/**
 * Transform the SSE response stream from Antigravity's wrapped format
 * to standard Gemini format that @ai-sdk/google expects.
 *
 * Antigravity wraps each SSE data event as: { response: { candidates: [...], ... } }
 * The standard Gemini API returns: { candidates: [...], ... }
 */
function unwrapAntigravityStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush remaining buffer
            if (buffer.trim()) {
              processBuffer(buffer, controller, encoder)
            }
            controller.close()
            return
          }
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split(/\r?\n\r?\n/)
          buffer = events.pop() || ""
          for (const event of events) {
            processBuffer(event, controller, encoder)
          }
        }
      } catch (e) {
        controller.error(e)
      }
    },
  })
}

function processBuffer(
  event: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const lines: string[] = []
  let eventType = ""
  for (const line of event.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim()
      continue
    }
    if (line.startsWith("data:")) {
      let val = line.slice(5)
      if (val.startsWith(" ")) val = val.slice(1)
      lines.push(val)
    }
  }
  const raw = lines.join("\n").trim()
  if (!raw || raw === "[DONE]") {
    // Pass through DONE
    if (raw === "[DONE]") {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
    }
    return
  }
  try {
    const parsed = JSON.parse(raw)
    // Unwrap the Antigravity envelope
    const inner = parsed.response ?? parsed
    // Re-emit as standard SSE
    const prefix = eventType ? `event: ${eventType}\n` : ""
    controller.enqueue(encoder.encode(`${prefix}data: ${JSON.stringify(inner)}\n\n`))
  } catch {
    // Pass through unparseable events
    controller.enqueue(encoder.encode(`data: ${raw}\n\n`))
  }
}

/**
 * Create the custom fetch function that intercepts @ai-sdk/google requests
 * and routes them through the Antigravity API.
 */
export function createAntigravityFetch(options: AntigravityOptions) {
  let accessToken = options.accessToken
  let projectId = options.projectId ?? "unknown"

  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

    // Only intercept requests to our proxy base URL
    if (!url.startsWith(PROXY_BASE)) {
      return fetch(input, init)
    }

    // Extract model ID from URL: {PROXY_BASE}/models/{modelId}:streamGenerateContent?alt=sse
    // or {PROXY_BASE}/models/{modelId}:generateContent
    const modelMatch = url.match(/\/models\/([^/:]+):(\w+)/)
    if (!modelMatch) {
      log.error("could not extract model from URL", { url })
      return fetch(input, init)
    }
    const modelId = modelMatch[1]
    const action = modelMatch[2]
    const isStreaming = url.includes("alt=sse")

    // Parse the body (which is the standard Gemini request body from @ai-sdk/google)
    let body: Record<string, unknown> = {}
    if (init?.body) {
      body = JSON.parse(init.body as string)
    }

    // Inject Antigravity-specific fields
    body.safetySettings = ANTIGRAVITY_SAFETY_SETTINGS
    body.sessionId = "-" + Math.floor(Math.random() * 9e18).toString()

    // Add thinking config for models that support it
    const budget = ANTIGRAVITY_THINKING_BUDGETS[modelId]
    if (budget !== undefined) {
      const config = (body.generationConfig ?? {}) as Record<string, unknown>
      config.thinkingConfig = { thinkingBudget: budget, includeThoughts: true }
      body.generationConfig = config
    }

    // Wrap in Antigravity envelope
    const envelope = {
      model: modelId,
      userAgent: ANTIGRAVITY_USER_AGENT,
      requestType: "agent",
      project: projectId,
      requestId: `agent-${crypto.randomUUID()}`,
      request: body,
    }

    const antigravityUrl = `${ANTIGRAVITY_BASE_URL}${ANTIGRAVITY_STREAM_ENDPOINT}${isStreaming ? "?alt=sse" : ""}`

    const doRequest = async (token: string) =>
      fetch(antigravityUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": ANTIGRAVITY_USER_AGENT,
          Accept: isStreaming ? "text/event-stream" : "application/json",
        },
        body: JSON.stringify(envelope),
      })

    let response = await doRequest(accessToken)

    // Handle 401 with token refresh
    if (response.status === 401 && options.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(options.refreshToken)
        accessToken = refreshed.access
        // Persist the refreshed tokens
        const info: Auth.Info = {
          type: "oauth",
          access: refreshed.access,
          refresh: refreshed.refresh ?? options.refreshToken,
          expires: refreshed.expires,
        }
        await Auth.set("antigravity", info)
        // Update the envelope with a fresh requestId
        envelope.requestId = `agent-${crypto.randomUUID()}`
        response = await doRequest(accessToken)
      } catch (e) {
        log.error("token refresh failed", { error: e })
      }
    }

    if (!response.ok) {
      return response
    }

    // For streaming responses, unwrap the Antigravity envelope from SSE events
    if (isStreaming && response.body) {
      const unwrapped = unwrapAntigravityStream(response.body)
      return new Response(unwrapped, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }

    // For non-streaming responses, unwrap the envelope
    if (response.body) {
      const text = await response.text()
      try {
        const parsed = JSON.parse(text)
        const inner = parsed.response ?? parsed
        return new Response(JSON.stringify(inner), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      } catch {
        return new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      }
    }

    return response
  }
}

/**
 * Fetch the Antigravity project ID from the API.
 */
export async function fetchProjectId(token: string): Promise<string | undefined> {
  try {
    const response = await fetch("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": ANTIGRAVITY_USER_AGENT,
      },
      body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY" } }),
    })
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>
      return (data.cloudaicompanionProject as string) ?? undefined
    }
  } catch (e) {
    log.error("failed to fetch project ID", { error: e })
  }
  return undefined
}
