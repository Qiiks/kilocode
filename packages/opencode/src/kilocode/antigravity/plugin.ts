// kilocode_change - new file
// Antigravity auth plugin: provides Google OAuth flow for the Antigravity provider.

import type { Plugin, AuthOuathResult } from "@kilocode/plugin"
import {
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_USER_AGENT,
  CALLBACK_PORT,
  DEFAULT_REDIRECT_URI,
} from "./const"

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CLIENT_ID,
    redirect_uri: DEFAULT_REDIRECT_URI,
    response_type: "code",
    scope: ANTIGRAVITY_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function exchangeCode(code: string): Promise<{
  access: string
  refresh: string
  expires: number
  email?: string
  projectId?: string
}> {
  const params = new URLSearchParams({
    code,
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
    redirect_uri: DEFAULT_REDIRECT_URI,
    grant_type: "authorization_code",
  })
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google OAuth exchange failed: ${response.status} - ${text}`)
  }
  const data = (await response.json()) as Record<string, unknown>
  const accessToken = data.access_token as string
  const refreshToken = data.refresh_token as string
  const expiresIn = (data.expires_in as number) ?? 3600

  // Fetch email
  const email = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then(async (r) => (r.ok ? (((await r.json()) as Record<string, unknown>).email as string) : undefined))
    .catch(() => undefined)

  // Fetch project ID
  const projectId = await fetch("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": ANTIGRAVITY_USER_AGENT,
    },
    body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY" } }),
  })
    .then(async (r) =>
      r.ok ? (((await r.json()) as Record<string, unknown>).cloudaicompanionProject as string) : undefined,
    )
    .catch(() => undefined)

  return {
    access: accessToken,
    refresh: refreshToken,
    expires: Date.now() + expiresIn * 1000,
    email,
    projectId,
  }
}

export const AntigravityAuthPlugin: Plugin = async () => {
  return {
    auth: {
      provider: "antigravity",
      async loader(getAuth) {
        const auth = await getAuth()
        if (!auth) return {}
        if (auth.type === "oauth") {
          return { accessToken: auth.access }
        }
        return {}
      },
      methods: [
        {
          type: "oauth" as const,
          label: "Antigravity (Google OAuth)",
          async authorize(): Promise<AuthOuathResult> {
            const state = crypto.randomUUID()
            const url = buildAuthUrl(state)

            // Start local HTTP server to receive the OAuth callback
            const { promise, resolve, reject } = Promise.withResolvers<string>()
            const timeout = setTimeout(() => reject(new Error("OAuth timeout (5 minutes)")), 300_000)

            const server = Bun.serve({
              port: CALLBACK_PORT,
              async fetch(req) {
                const reqUrl = new URL(req.url)
                if (reqUrl.pathname !== "/oauth-callback") {
                  return new Response("Not found", { status: 404 })
                }
                const code = reqUrl.searchParams.get("code")
                const error = reqUrl.searchParams.get("error")
                if (error) {
                  resolve("")
                  return new Response(
                    "<html><body><h1>Authorization Failed</h1><p>You can close this tab.</p></body></html>",
                    { headers: { "Content-Type": "text/html" } },
                  )
                }
                if (code) {
                  resolve(code)
                  return new Response(
                    "<html><body><h1>Authorization Successful</h1><p>You can close this tab.</p></body></html>",
                    { headers: { "Content-Type": "text/html" } },
                  )
                }
                return new Response("Missing code", { status: 400 })
              },
            })

            // Open browser
            const open = await import("open").then((m) => m.default).catch(() => undefined)
            if (open) await open(url).catch(() => {})

            return {
              url,
              instructions: `Open the URL in your browser and sign in with your Google account.`,
              method: "auto" as const,
              async callback() {
                try {
                  const code = await promise
                  if (!code) return { type: "failed" as const }
                  const result = await exchangeCode(code)
                  return {
                    type: "success" as const,
                    access: result.access,
                    refresh: result.refresh,
                    expires: result.expires,
                    accountId: result.projectId,
                  }
                } catch {
                  return { type: "failed" as const }
                } finally {
                  clearTimeout(timeout)
                  server.stop()
                }
              },
            }
          },
        },
      ],
    },
  }
}
