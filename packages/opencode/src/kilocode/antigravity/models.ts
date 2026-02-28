// kilocode_change - new file
// Antigravity model definitions (hardcoded fallback + dynamic fetch).

import type { ModelsDev } from "@/provider/models"
import { ANTIGRAVITY_BASE_URL, ANTIGRAVITY_USER_AGENT } from "./const"

const PROXY_BASE = "https://antigravity-proxy.internal/v1beta"

function geminiModel(
  id: string,
  name: string,
  opts?: { context?: number; output?: number; images?: boolean; thinking?: boolean },
): ModelsDev.Model {
  const context = opts?.context ?? 1_048_576
  const output = opts?.output ?? 65_536
  const images = opts?.images ?? true
  const thinking = opts?.thinking ?? true
  return {
    id,
    name,
    family: "gemini",
    release_date: "2025-01-01",
    attachment: images,
    reasoning: thinking,
    temperature: true,
    tool_call: true,
    cost: { input: 0, output: 0 },
    limit: { context, output },
    modalities: {
      input: images ? ["text", "image"] : ["text"],
      output: ["text"],
    },
    prompt: "gemini",
    options: {},
    provider: { npm: "@ai-sdk/google", api: PROXY_BASE },
  }
}

function claudeModel(
  id: string,
  name: string,
  opts?: { context?: number; output?: number },
): ModelsDev.Model {
  const context = opts?.context ?? 200_000
  const output = opts?.output ?? 64_000
  return {
    id,
    name,
    family: "claude",
    release_date: "2025-01-01",
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    cost: { input: 0, output: 0 },
    limit: { context, output },
    modalities: {
      input: ["text", "image"],
      output: ["text"],
    },
    // Use gemini prompt since Antigravity wraps everything in Gemini format
    prompt: "gemini",
    options: {},
    provider: { npm: "@ai-sdk/google", api: PROXY_BASE },
  }
}

/** Hardcoded fallback models for when dynamic fetch is unavailable. */
export const ANTIGRAVITY_MODELS: Record<string, ModelsDev.Model> = {
  "gemini-3-flash": geminiModel("gemini-3-flash", "Gemini 3 Flash"),
  "gemini-3-pro-high": geminiModel("gemini-3-pro-high", "Gemini 3 Pro (High)"),
  "gemini-3-pro-low": geminiModel("gemini-3-pro-low", "Gemini 3 Pro (Low)"),
  "gemini-3.1-pro-high": geminiModel("gemini-3.1-pro-high", "Gemini 3.1 Pro (High)"),
  "gemini-3.1-pro-low": geminiModel("gemini-3.1-pro-low", "Gemini 3.1 Pro (Low)"),
  "gemini-2.5-pro": geminiModel("gemini-2.5-pro", "Gemini 2.5 Pro"),
  "gemini-2.5-flash": geminiModel("gemini-2.5-flash", "Gemini 2.5 Flash"),
  "gemini-2.5-flash-thinking": geminiModel("gemini-2.5-flash-thinking", "Gemini 2.5 Flash (Thinking)"),
  "gemini-2.5-flash-lite": geminiModel("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", { thinking: false }),
  "claude-sonnet-4-6": claudeModel("claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)"),
  "claude-opus-4-6-thinking": claudeModel("claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)"),
  "gpt-oss-120b-medium": geminiModel("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", {
    context: 114_000,
    output: 32_768,
    images: false,
  }),
}

const FETCH_MODELS_URL = "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels"

/**
 * Fetch available models from the Antigravity API.
 * Returns models in ModelsDev format.
 */
export async function fetchAntigravityModels(options: {
  accessToken: string
  projectId?: string
}): Promise<Record<string, ModelsDev.Model>> {
  const response = await fetch(FETCH_MODELS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": ANTIGRAVITY_USER_AGENT,
    },
    body: JSON.stringify({ project: options.projectId ?? "" }),
  })

  if (!response.ok) return ANTIGRAVITY_MODELS

  const data = (await response.json()) as { models?: Record<string, Record<string, unknown>> }
  const raw = data.models ?? {}
  const result: Record<string, ModelsDev.Model> = {}

  for (const [id, info] of Object.entries(raw)) {
    if (info.isInternal || !info.displayName) continue

    const name = info.displayName as string
    const thinking = info.supportsThinking === true
    const images = info.supportsImages === true
    const context = (info.maxTokens as number) ?? 1_048_576
    const output = (info.maxOutputTokens as number) ?? 65_536
    const family = id.startsWith("claude") ? "claude" : id.startsWith("gpt") ? "gpt" : "gemini"

    result[id] = {
      id,
      name,
      family,
      release_date: "2025-01-01",
      attachment: images,
      reasoning: thinking,
      temperature: true,
      tool_call: true,
      cost: { input: 0, output: 0 },
      limit: { context, output },
      modalities: {
        input: images ? ["text", "image"] : ["text"],
        output: ["text"],
      },
      prompt: "gemini",
      options: {},
      provider: { npm: "@ai-sdk/google", api: PROXY_BASE },
    }
  }

  return Object.keys(result).length > 0 ? result : ANTIGRAVITY_MODELS
}
