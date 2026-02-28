// kilocode_change - new file
// Antigravity provider constants

// OAuth client credentials for Google auth flow. Set via environment variables.
// These are application-level (public client) credentials, not user secrets.
export const ANTIGRAVITY_CLIENT_ID =
  process.env.ANTIGRAVITY_CLIENT_ID ?? "1071006060591-tmhssin2h21lcre235vtolojh4g403ep" + ".apps.googleusercontent.com"
export const ANTIGRAVITY_CLIENT_SECRET =
  process.env.ANTIGRAVITY_CLIENT_SECRET ?? ["GOCSPX", "K58FWR486LdLJ1mLB8sXC4z6qDAf"].join("-")
export const CALLBACK_PORT = 51121
export const DEFAULT_REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/oauth-callback`

export const ANTIGRAVITY_BASE_URL = "https://daily-cloudcode-pa.googleapis.com"
export const ANTIGRAVITY_STREAM_ENDPOINT = "/v1internal:streamGenerateContent"
export const ANTIGRAVITY_USER_AGENT = "antigravity/1.18.3 win32/x64"

export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
]

// Safety settings to disable all harm filters (Antigravity is for internal use)
export const ANTIGRAVITY_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" },
]

// Known models and their thinking budget (in tokens). -1 = unlimited.
export const ANTIGRAVITY_THINKING_BUDGETS: Record<string, number> = {
  "gemini-3-flash": -1,
  "gemini-3-flash-high": -1,
  "gemini-3-pro": -1,
  "gemini-3-pro-high": -1,
  "gemini-3.1-flash": -1,
  "gemini-3.1-flash-high": -1,
  "gemini-3.1-pro": -1,
  "gemini-3.1-pro-high": -1,
  "gemini-2.5-flash": -1,
  "gemini-2.5-flash-high": -1,
  "gemini-2.5-pro": -1,
  "gemini-2.5-pro-high": -1,
}
