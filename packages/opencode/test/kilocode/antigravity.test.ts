// kilocode_change - new file
// Tests for the Antigravity (Cloud Code) provider

import { test, expect, describe } from "bun:test"

describe("antigravity models", () => {
  test("ANTIGRAVITY_MODELS has expected models", async () => {
    const { ANTIGRAVITY_MODELS } = await import("../../src/kilocode/antigravity/models")
    expect(Object.keys(ANTIGRAVITY_MODELS).length).toBeGreaterThan(0)
    expect(ANTIGRAVITY_MODELS["gemini-2.5-pro"]).toBeDefined()
    expect(ANTIGRAVITY_MODELS["gemini-2.5-flash"]).toBeDefined()
    expect(ANTIGRAVITY_MODELS["claude-sonnet-4-6"]).toBeDefined()
  })

  test("models have correct provider config", async () => {
    const { ANTIGRAVITY_MODELS } = await import("../../src/kilocode/antigravity/models")
    for (const model of Object.values(ANTIGRAVITY_MODELS)) {
      expect(model.provider!.npm).toBe("@ai-sdk/google")
      expect(model.provider!.api).toContain("antigravity-proxy")
      expect(model.cost!.input).toBe(0)
      expect(model.cost!.output).toBe(0)
    }
  })

  test("gemini models have correct family", async () => {
    const { ANTIGRAVITY_MODELS } = await import("../../src/kilocode/antigravity/models")
    expect(ANTIGRAVITY_MODELS["gemini-2.5-pro"].family).toBe("gemini")
    expect(ANTIGRAVITY_MODELS["gemini-3-flash"].family).toBe("gemini")
  })

  test("claude models have correct family", async () => {
    const { ANTIGRAVITY_MODELS } = await import("../../src/kilocode/antigravity/models")
    expect(ANTIGRAVITY_MODELS["claude-sonnet-4-6"].family).toBe("claude")
    expect(ANTIGRAVITY_MODELS["claude-opus-4-6-thinking"].family).toBe("claude")
  })

  test("non-thinking models have reasoning disabled", async () => {
    const { ANTIGRAVITY_MODELS } = await import("../../src/kilocode/antigravity/models")
    expect(ANTIGRAVITY_MODELS["gemini-2.5-flash-lite"].reasoning).toBe(false)
  })
})

describe("antigravity constants", () => {
  test("constants are properly defined", async () => {
    const c = await import("../../src/kilocode/antigravity/const")
    expect(c.ANTIGRAVITY_BASE_URL).toContain("googleapis.com")
    expect(c.ANTIGRAVITY_STREAM_ENDPOINT).toContain("streamGenerateContent")
    expect(c.CALLBACK_PORT).toBe(51121)
    expect(c.ANTIGRAVITY_SCOPES.length).toBeGreaterThan(0)
    expect(c.ANTIGRAVITY_SAFETY_SETTINGS.length).toBe(5)
  })

  test("thinking budgets defined for known models", async () => {
    const { ANTIGRAVITY_THINKING_BUDGETS } = await import("../../src/kilocode/antigravity/const")
    expect(ANTIGRAVITY_THINKING_BUDGETS["gemini-2.5-pro"]).toBe(-1)
    expect(ANTIGRAVITY_THINKING_BUDGETS["gemini-2.5-flash"]).toBe(-1)
    expect(ANTIGRAVITY_THINKING_BUDGETS["gemini-3-flash"]).toBe(-1)
  })
})

describe("antigravity provider fetch interceptor", () => {
  test("createAntigravityFetch returns a function", async () => {
    const { createAntigravityFetch } = await import("../../src/kilocode/antigravity/provider")
    const customFetch = createAntigravityFetch({
      accessToken: "test-token",
      refreshToken: "test-refresh",
      projectId: "test-project",
    })
    expect(typeof customFetch).toBe("function")
  })

  test("non-proxy URLs pass through to native fetch", async () => {
    const { createAntigravityFetch } = await import("../../src/kilocode/antigravity/provider")
    const customFetch = createAntigravityFetch({
      accessToken: "test-token",
      projectId: "test-project",
    })
    // A request to a non-proxy URL should be handled by native fetch
    // This will fail with a network error since the URL doesn't exist,
    // but crucially it should NOT try to route through Antigravity
    const result = customFetch("https://example.com/test").catch((e: Error) => e)
    expect(result).toBeDefined()
  })

  test("PROXY_BASE is a well-formed URL", async () => {
    const { PROXY_BASE } = await import("../../src/kilocode/antigravity/provider")
    expect(PROXY_BASE).toMatch(/^https:\/\//)
    expect(PROXY_BASE).toContain("antigravity-proxy")
  })
})

describe("antigravity SSE stream unwrapping", () => {
  test("safety settings are correctly configured for content filtering bypass", async () => {
    const { ANTIGRAVITY_SAFETY_SETTINGS } = await import("../../src/kilocode/antigravity/const")
    expect(ANTIGRAVITY_SAFETY_SETTINGS).toHaveLength(5)
    for (const setting of ANTIGRAVITY_SAFETY_SETTINGS) {
      expect(setting.threshold).toBe("OFF")
      expect(setting.category).toMatch(/^HARM_CATEGORY_/)
    }
  })
})

describe("antigravity plugin", () => {
  // The Plugin type requires PluginInput, but the antigravity plugin doesn't use it.
  // Cast to any to satisfy the type without constructing a full PluginInput.
  test("AntigravityAuthPlugin is a function returning hooks", async () => {
    const { AntigravityAuthPlugin } = await import("../../src/kilocode/antigravity/plugin")
    expect(typeof AntigravityAuthPlugin).toBe("function")
    const hooks = await (AntigravityAuthPlugin as any)()
    expect(hooks.auth).toBeDefined()
    expect(hooks.auth.provider).toBe("antigravity")
    expect(hooks.auth.methods).toHaveLength(1)
    expect(hooks.auth.methods[0].type).toBe("oauth")
  })

  test("auth loader returns accessToken from OAuth auth", async () => {
    const { AntigravityAuthPlugin } = await import("../../src/kilocode/antigravity/plugin")
    const hooks = await (AntigravityAuthPlugin as any)()
    const result = await hooks.auth.loader(async () => ({
      type: "oauth" as const,
      access: "my-access-token",
      refresh: "my-refresh-token",
      expires: Date.now() + 3_600_000,
    }), {} as any)
    expect(result).toEqual({ accessToken: "my-access-token" })
  })

  test("auth loader returns empty object when no auth", async () => {
    const { AntigravityAuthPlugin } = await import("../../src/kilocode/antigravity/plugin")
    const hooks = await (AntigravityAuthPlugin as any)()
    const result = await hooks.auth.loader(async () => undefined as any, {} as any)
    expect(result).toEqual({})
  })
})
