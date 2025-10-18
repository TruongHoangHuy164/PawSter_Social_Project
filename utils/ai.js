// OpenRouter helper for AI integration
// Usage: set OPENROUTER_API_KEY in your environment (DO NOT commit secrets).
// Optional: OPENROUTER_BASE_URL, OPENROUTER_MODEL, APP_URL, APP_NAME
// Example (PowerShell): $env:OPENROUTER_API_KEY="sk-or-v1-..."; npm run dev

import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
// Choose a sensible default model; you can override via env or per-call
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

// These headers are encouraged by OpenRouter for attribution
const REFERER = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
const TITLE = process.env.APP_NAME || "PawSter";

function ensureConfigured() {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Set it in your environment (e.g., in .env)."
    );
  }
}

function buildHeaders(extra = {}) {
  ensureConfigured();
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": REFERER,
    "X-Title": TITLE,
    "Content-Type": "application/json",
    ...extra,
  };
}

const client = axios.create({
  baseURL: OPENROUTER_BASE_URL,
  timeout: 60_000,
});

/**
 * Chat completion with OpenRouter
 * @param {Object} params
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} params.messages
 * @param {string} [params.model]
 * @param {number} [params.temperature]
 * @param {number} [params.max_tokens]
 * @param {Object} [params.provider] - provider routing options, see OpenRouter docs
 * @returns {Promise<{text: string, raw: any}>}
 */
export async function chat({
  messages = [],
  model = OPENROUTER_MODEL,
  temperature = 0.7,
  max_tokens,
  provider,
} = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("chat(): messages must be a non-empty array");
  }

  const body = {
    model,
    messages,
    temperature,
    ...(typeof max_tokens === "number" ? { max_tokens } : {}),
    ...(provider ? { provider } : {}),
  };

  const { data } = await client.post(
    "/chat/completions",
    body,
    { headers: buildHeaders() }
  );

  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text, raw: data };
}

/**
 * Simple helper for single-prompt chat (wraps chat with a user message)
 * @param {string} prompt
 * @param {Object} options - same options as chat()
 */
export async function ask(prompt, options = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("ask(): prompt must be a non-empty string");
  }
  const { text, raw } = await chat({
    messages: [{ role: "user", content: prompt }],
    ...options,
  });
  return { text, raw };
}

export function isConfigured() {
  return Boolean(OPENROUTER_API_KEY);
}

export default { chat, ask, isConfigured };
