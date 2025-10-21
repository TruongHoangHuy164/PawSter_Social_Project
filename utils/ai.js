// OpenRouter helper for AI integration
// Usage: set OPENROUTER_API_KEY in your environment (DO NOT commit secrets).
// Optional: OPENROUTER_BASE_URL, OPENROUTER_MODEL, APP_URL, APP_NAME
// Example (PowerShell): $env:OPENROUTER_API_KEY="sk-or-v1-..."; npm run dev

import axios from "axios";
import http from "http";
import https from "https";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
// Choose a sensible default model; you can override via env or per-call
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/shieldgemma-2-9b";
// Allow specialized models per modality (text vs image)
const TEXT_MODERATION_MODEL = process.env.TEXT_MODERATION_MODEL || OPENROUTER_MODEL || "google/shieldgemma-2-9b";
// Default to a fast, vision-capable model; allow overriding to ShieldGemma/Mistral Vision via env
const IMAGE_MODERATION_MODEL = process.env.IMAGE_MODERATION_MODEL || "google/gemini-1.5-flash"; // e.g., "google/gemini-1.5-flash", "google/shieldgemma-2-9b:vision", "mistralai/mistral-small-3.2:vision"
const MOD_FAILSAFE_FLAG = String(process.env.MOD_FAILSAFE_FLAG || "0") === "1";

// These headers are encouraged by OpenRouter for attribution
const REFERER = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
const TITLE = process.env.APP_NAME || "PawSter";

// Performance knobs (optional)
const MOD_TEXT_AI_ONLY_IF_REGEX = String(process.env.MOD_TEXT_AI_ONLY_IF_REGEX || "0") === "1"; // call text AI only if regex hits
const MOD_IMAGE_AI_ONLY_IF_REKOGNITION_FLAGGED = String(process.env.MOD_IMAGE_AI_ONLY_IF_REKOGNITION_FLAGGED || "0") === "1"; // vision AI only if rekognition raised concerns
const MOD_IMAGE_MAX = Math.max(1, Number(process.env.MOD_IMAGE_MAX || 6)); // limit images per call
const MOD_TEXT_MAX_TOKENS = Math.max(64, Number(process.env.MOD_TEXT_MAX_TOKENS || 160));
const MOD_IMAGE_MAX_TOKENS = Math.max(128, Number(process.env.MOD_IMAGE_MAX_TOKENS || 220));

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

const agentHttp = new http.Agent({ keepAlive: true, maxSockets: 50 });
const agentHttps = new https.Agent({ keepAlive: true, maxSockets: 50 });
const client = axios.create({
  baseURL: OPENROUTER_BASE_URL,
  timeout: 60_000,
  httpAgent: agentHttp,
  httpsAgent: agentHttps,
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

// --- Content Moderation Helpers ---

// Vietnamese normalization for accent-insensitive matching
function viNormalize(str = "") {
  try {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  } catch {
    return String(str || "").toLowerCase();
  }
}

// Basic keyword lists (extend carefully to avoid too many false positives)
const VIOLENCE_HARD = [
  /\b(chem\s*giet|giet\s*nguoi|hiep\s*dam|cuong\s*hiep|mau\s*me|do\s*mau|chat\s*dau|cat\s*dau|behead|gore|murder|rape)\b/i,
];
const VIOLENCE_SOFT = [
  /\b(danh\s*nhau|au\s*da|choang\s*nhau|choang|va\s*cham|fight|brawl|combat)\b/i,
];
const SEXUAL_EXPLICIT = [
  /\b(dam\s*duc|du\s*me|khoe\s*than|khoa\s*than|khoe\s*nguc|khoe\s*vung\s*kin|quan\s*he|tinh\s*duc|loan\s*luan|an\s*hiep|sex|porn|xxx|dick|pussy|boobs|nude|18\s*\+)\b/i,
  /\b(au\s*dam|tre\s*vi\s*thanh\s*nien|underage|minor)\b/i,
];
const SELF_HARM = [
  /\b(muon\s*chet|tu\s*tu|tu\s*sat|cat\s*tay|tu\s*lam\s*dau|nhay\s*cau|ket\s*lieu|suicide|kill\s*myself)\b/i,
];
const HATE = [
  /\b(ky\s*thi|ki\s*thi|phan\s*biet(\s*chung\s*toc)?|racist|hate\s*speech|xuc\s*pham\s*(chung\s*toc|gioi\s*tinh|ton\s*giao))\b/i,
];

// Vietnamese harassment/profanity (non-hate) — normalized matching
const HARASSMENT = [
  /\b(dmm|dm|dcm|dmmm|dclm|clm|clmm|vcl|vkl)\b/i,
  /\b(dit|djt|djt\s*me|dit\s*me|deo|deo\s*me|de\s*o)\b/i,
  /\b(oc\s*cho|occho|oc\s*lon|d\s*o\s*ngu|do\s*ngu|ngu\s*vl|cuc\s*cho|thang\s*cho|do\s*suc\s*vat)\b/i,
  /\b(chet\s*me|cu\s*t|cut|cut\s*di|cot\s*di|cot\s*di|cot\s*m)\b/i,
  /\b(me\s*may|bo\s*may|do\s*mat\s*day|c\s*ut|cu\s*t)\b/i,
  // Explicit Vietnamese vulgar slang (with diacritics) — safe from false positives on normalized text
  /\b(đụ|địt|chịch|cặc|lồn)\b/i,
  // ASCII/obfuscated variants commonly used to bypass filters (avoid overbroad 'cac' and 'lon')
  /\b(dit|djt|chich|cak)\b/i,
  /\b(đụ|địt|chịch|dit|djt|chich)\s*(mẹ|má|mày|may|con|bố|bo|cha)\b/i,
  // Obfuscated lồn (using 0 or *), still conservative
  /\bl[0\*]n\b/i,
];

function regexCategories(text) {
  if (!text) return [];
  const norm = viNormalize(text);
  const cats = new Set();
  for (const re of VIOLENCE_HARD) if (re.test(norm) || re.test(text)) cats.add("violence_hard");
  for (const re of VIOLENCE_SOFT) if (re.test(norm) || re.test(text)) cats.add("violence_soft");
  for (const re of SEXUAL_EXPLICIT) if (re.test(norm) || re.test(text)) cats.add("sexual_explicit");
  for (const re of SELF_HARM) if (re.test(norm) || re.test(text)) cats.add("self_harm");
  for (const re of HATE) if (re.test(norm) || re.test(text)) cats.add("hate");
  for (const re of HARASSMENT) if (re.test(norm) || re.test(text)) cats.add("harassment");
  return Array.from(cats);
}

/**
 * Moderate text (and optional images) using a hybrid approach: regex precheck + AI scoring.
 * Returns { action: 'APPROVE'|'FLAG'|'REJECT', score: 0..1, categories: string[], notes }
 * Thresholds can be customized via env: MOD_SOFT=0.6, MOD_HARD=0.85
 */
export async function moderateContent({ text, imageKeys = [], imageUrls = [] }) {
  // Run text and image moderation in parallel to reduce latency
  const [textRes, imgRes] = await Promise.all([
    moderateText({ text }),
    checkImageSensitivity({ imageKeys, imageUrls }),
  ]);

  // 3) Aggregate
  const soft = Number(process.env.MOD_SOFT || 0.6);
  const hard = Number(process.env.MOD_HARD || 0.85);
  const maxScore = Math.max(textRes.score || 0, imgRes?.aggregate?.maxScore || 0);
  const cats = new Set([...(textRes.categories || []), ...((imgRes?.aggregate?.categories) || [])]);
  let action = "APPROVE";
  if (maxScore >= hard) action = "REJECT";
  else if (maxScore >= soft) action = "FLAG";

  return {
    action,
    score: maxScore,
    categories: cats.size ? Array.from(cats) : ["safe"],
    notes: textRes.notes || "",
    text: textRes,
    images: imgRes,
  };
}

/**
 * Moderate text only using hybrid approach: Vietnamese regex + AI classifier
 */
export async function moderateText({ text }) {
  const catsRegex = regexCategories(text);
  let heuristic = 0;
  if (catsRegex.includes("violence_hard") || catsRegex.includes("sexual_explicit") || catsRegex.includes("hate")) heuristic = Math.max(heuristic, 0.7);
  if (catsRegex.includes("self_harm")) heuristic = Math.max(heuristic, 0.65);
  if (catsRegex.includes("violence_soft")) heuristic = Math.max(heuristic, 0.4);
  if (catsRegex.includes("harassment")) heuristic = Math.max(heuristic, 0.6);

  let aiScore = 0;
  let aiCats = [];
  let aiNotes = "";
  try {
    // Skip AI call for text if configured and regex found nothing
    if (!(MOD_TEXT_AI_ONLY_IF_REGEX && catsRegex.length === 0)) {
      const sys = [
        "Bạn là hệ thống kiểm duyệt văn bản (tiếng Việt có/không dấu).",
        "Trả về JSON: {\"score\": number 0..1, \"categories\": [violence_hard|violence_soft|sexual_explicit|self_harm|hate|harassment|safe], \"decision\": \"APPROVE|FLAG|REJECT\" }",
        "REJECT: gore/hiếp dâm/ấu dâm/khiêu dâm rõ ràng/hướng dẫn tự hại. FLAG: bạo lực nhẹ/gợi dục/nhắc tự hại/chửi tục/đe doạ.",
      ].join(" \n");
      const prompt = `Văn bản:\n${text || "(không có)"}`;
      const { text: out } = await chat({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
        model: TEXT_MODERATION_MODEL,
        temperature: 0,
        max_tokens: MOD_TEXT_MAX_TOKENS,
      });
      const match = out.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        aiScore = Number(parsed.score) || 0;
        aiCats = Array.isArray(parsed.categories) ? parsed.categories : [];
        aiNotes = parsed.decision || "";
      }
    }
  } catch {}

  const soft = Number(process.env.MOD_SOFT || 0.6);
  const hard = Number(process.env.MOD_HARD || 0.85);
  const score = Math.max(heuristic, aiScore);
  let decision = "APPROVE";
  if (score >= hard) decision = "REJECT";
  else if (score >= soft) decision = "FLAG";
  const categories = Array.from(new Set([...(catsRegex || []), ...(aiCats || [])]));
  return { score, categories: categories.length ? categories : ["safe"], decision, notes: aiNotes, model: TEXT_MODERATION_MODEL };
}

export const moderation = { moderateContent, moderateText };

/**
 * Check image sensitivity using hybrid approach.
 * - If imageKeys provided and MOD_USE_REKOGNITION=1 with AWS creds, use Rekognition per-key
 * - If imageUrls provided and the selected OpenRouter model supports vision, send URLs to AI for scoring
 * Returns per-image results and an aggregate decision.
 * @param {Object} params
 * @param {string[]} [params.imageKeys]
 * @param {string[]} [params.imageUrls]
 * @returns {Promise<{ images: Array<{ key?: string, url?: string, score: number, categories: string[], decision: 'APPROVE'|'FLAG'|'REJECT', source: 'rekognition'|'ai'|'hybrid', raw?: any }>, aggregate: { maxScore: number, decision: 'APPROVE'|'FLAG'|'REJECT', categories: string[] } }>} 
 */
export async function checkImageSensitivity({ imageKeys = [], imageUrls = [] } = {}) {
  const soft = Number(process.env.MOD_SOFT || 0.6);
  const hard = Number(process.env.MOD_HARD || 0.85);

  const results = [];

  // 1) Rekognition for S3 keys (optional)
  let rekognitionMaxScore = 0;
  if (process.env.MOD_USE_REKOGNITION === "1" && imageKeys.length) {
    try {
      const mod = await import("@aws-sdk/client-rekognition");
      const { RekognitionClient, DetectModerationLabelsCommand } = mod;
      const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
      if (bucket && process.env.AWS_REGION) {
        const rk = new RekognitionClient({ region: process.env.AWS_REGION });
        for (const key of imageKeys.slice(0, 6)) { // cap to 6
          try {
            const out = await rk.send(new DetectModerationLabelsCommand({
              Image: { S3Object: { Bucket: bucket, Name: key } },
              MinConfidence: 70,
            }));
            const labels = out.ModerationLabels || [];
            let score = 0;
            const cats = new Set();
            for (const lab of labels) {
              const name = String(lab.Name || "").toLowerCase();
              const conf = Number(lab.Confidence || 0) / 100; // 0..1
              if (/sexual|nudity|explicit|suggestive/.test(name)) {
                cats.add("sexual_explicit");
                score = Math.max(score, conf >= 0.9 ? 0.9 : 0.7);
              }
              if (/violence|gore|blood/.test(name)) {
                cats.add("violence_hard");
                score = Math.max(score, conf >= 0.9 ? 0.9 : 0.7);
              }
              if (/hate|weapon|drugs/.test(name)) {
                cats.add("hate");
                score = Math.max(score, 0.65);
              }
            }
            let decision = "APPROVE";
            if (score >= hard) decision = "REJECT";
            else if (score >= soft) decision = "FLAG";
            results.push({ key, score, categories: Array.from(cats).length ? Array.from(cats) : ["safe"], decision, source: "rekognition", raw: labels });
            rekognitionMaxScore = Math.max(rekognitionMaxScore, score);
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[moderation] Rekognition moderation failed:", e?.message || e);
    }
  }

  // 2) AI Vision for URLs (if provided)
  const aiShouldRun = Array.isArray(imageUrls) && imageUrls.length && (
    !MOD_IMAGE_AI_ONLY_IF_REKOGNITION_FLAGGED || rekognitionMaxScore >= soft
  );
  if (aiShouldRun) {
    try {
      const sys = [
        "Bạn là hệ thống kiểm duyệt hình ảnh. Phân loại CHI TIẾT theo danh mục sau và quy đổi về nhóm tổng quát:",
        "- Nudity: nudity_explicit, nudity_partial, sexual_activity, sexual_context",
        "- Violence: violence_graphic, violence_non_graphic, weapons",
        "- Hate/Symbols: hate_symbols, extremist_symbols",
        "- Self harm: self_harm, suicide",
        "- Other: drugs, alcohol, harassment",
        "Trả về mảng JSON: mỗi phần tử { url: string, score: 0..1, categories: string[], decision: 'APPROVE'|'FLAG'|'REJECT', details?: string[] }",
        "Quy tắc quyết định: REJECT cho nudity_explicit/sexual_activity/violence_graphic/ấu dâm; FLAG cho nudity_partial/sexual_context/violence_non_graphic/hate_symbols.",
        "CHỈ trả về JSON hợp lệ (mảng)."
      ].join(" \n");
  const prompt = `Phân tích ảnh (URL có thời hạn):\n${imageUrls.slice(0, MOD_IMAGE_MAX).join("\n")}`;
      // Try multiple content encodings to satisfy different providers
      const variants = [
        // OpenAI-style (object)
        imageUrls.slice(0, MOD_IMAGE_MAX).map((u) => ({ type: "image_url", image_url: { url: u } })),
        // OpenAI-style (string)
        imageUrls.slice(0, MOD_IMAGE_MAX).map((u) => ({ type: "image_url", image_url: u })),
        // OpenRouter legacy style
        imageUrls.slice(0, MOD_IMAGE_MAX).map((u) => ({ type: "input_image", image_url: u })),
      ];

      let parsed = null;
      for (let vi = 0; vi < variants.length && !parsed; vi++) {
        const contentTypes = vi === 2 ? { textType: "input_text" } : { textType: "text" };
        const userContent = [
          { type: contentTypes.textType, text: prompt },
          ...variants[vi],
        ];
        try {
          const { text: out } = await chat({
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userContent },
            ],
            model: IMAGE_MODERATION_MODEL,
            temperature: 0,
            max_tokens: MOD_IMAGE_MAX_TOKENS,
          });
          const match = out.match(/\[[\s\S]*\]/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (e) {
          // try next variant
          continue;
        }
      }

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const url = item.url || null;
          const score = Number(item.score) || 0;
          // Merge detailed categories into our coarse schema
          const details = Array.isArray(item.details) ? item.details : [];
          const rawCats = Array.isArray(item.categories) ? item.categories : [];
          const allCats = new Set([...rawCats, ...details]);
          const cats = new Set();
          for (const c of allCats) {
            const s = String(c || "").toLowerCase();
            if (/nudity_explicit|sexual_activity/.test(s)) cats.add("sexual_explicit");
            if (/nudity_partial|sexual_context|suggestive/.test(s)) cats.add("sexual_soft");
            if (/violence_graphic|gore|blood/.test(s)) cats.add("violence_hard");
            if (/violence_non_graphic|fight|weapon/.test(s)) cats.add("violence_soft");
            if (/hate|extremist/.test(s)) cats.add("hate");
            if (/self_harm|suicide/.test(s)) cats.add("self_harm");
            if (/harassment/.test(s)) cats.add("harassment");
            if (/drugs|alcohol/.test(s)) cats.add("other");
          }
          let decision = item.decision || (score >= hard ? "REJECT" : score >= soft ? "FLAG" : "APPROVE");
          const categories = Array.from(cats).length ? Array.from(cats) : ["safe"];
          results.push({ url, score, categories, decision, source: "ai", details: Array.from(allCats) });
        }
      }
    } catch (e) {
      console.warn("[moderation] Vision model call failed:", e?.message || e);
    }
  }

  // Aggregate decision
  let maxScore = 0;
  const aggCats = new Set();
  for (const r of results) {
    maxScore = Math.max(maxScore, Number(r.score) || 0);
    for (const c of r.categories || []) aggCats.add(c);
  }
  let aggDecision = "APPROVE";
  if (maxScore >= hard) aggDecision = "REJECT";
  else if (maxScore >= soft) aggDecision = "FLAG";

  // Failsafe: if we had image URLs but got no results at all, optionally auto-FLAG
  if (MOD_FAILSAFE_FLAG && Array.isArray(imageUrls) && imageUrls.length && results.length === 0) {
    console.warn("[moderation] Failsafe active: no image moderation results; auto-FLAG images.");
    for (const u of imageUrls) {
      results.push({ url: u, score: soft + 0.01, categories: ["potential_sensitive"], decision: "FLAG", source: "failsafe" });
    }
    maxScore = soft + 0.01;
    aggDecision = "FLAG";
    aggCats.add("potential_sensitive");
  }

  return {
    images: results,
    aggregate: { maxScore, decision: aggDecision, categories: Array.from(aggCats).length ? Array.from(aggCats) : ["safe"] },
  };
}
