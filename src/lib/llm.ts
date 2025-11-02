// src/lib/llm.ts
// Codr — Unified LLM logic via Cloudflare AI Gateway (+ Google AI Studio for UI code)

export type Provider = "anthropic" | "openai" | "google" | "openrouter" | "replicate" | "googleai";

export interface LLMChoice {
  provider: Provider;
  model: string;
  reason: string;
  fallback?: { provider: Provider; model: string; reason: string };
}

export interface EnvReq {
  AI_GATEWAY: string;                 // e.g. https://gateway.ai.cloudflare.com/v1/<acct>/<gw>
  OPENROUTER_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  GOOGLE_AI_STUDIO_API_KEY?: string;  // Gemini for UI code gen
  AGENT_ASSETS?: any;                 // R2 bucket for assets
}

// --------------------- Model picker (quality-first, budget fallback) ---------------------
export function pickLLMForJTBD(jtbd: string): LLMChoice {
  const s = (jtbd || "").toLowerCase();

  // UI code generation (front-end)
  if (s.includes("ui") || s.includes("interface") || s.includes("dashboard")) {
    return { provider: "googleai", model: "gemini-2.0-pro-exp", reason: "front-end code generation" };
  }

  // Copywriting, emails, summaries
  if (s.includes("copy") || s.includes("email") || s.includes("summary")) {
    return {
      provider: "anthropic",
      model: "claude-3.7-sonnet",
      reason: "long-form & nuance",
      fallback: { provider: "openai", model: "gpt-5-mini", reason: "budget alternative" },
    };
  }

  // Vision / audio / transcription
  if (s.includes("vision") || s.includes("image") || s.includes("audio") || s.includes("transcribe")) {
    return { provider: "google", model: "gemini-2.5-pro", reason: "multimodal strength" };
  }

  // Analysis / reporting / data shaping
  if (s.includes("analysis") || s.includes("report") || s.includes("data")) {
    return { provider: "openai", model: "gpt-5", reason: "reasoning & structured outputs" };
  }

  // Default: balanced generalist
  return {
    provider: "anthropic",
    model: "claude-3.7-sonnet",
    reason: "balanced generalist",
    fallback: { provider: "openai", model: "gpt-5-mini", reason: "budget alternative" },
  };
}

// --------------------- Helpers ---------------------
function cleanBase(base?: string) {
  if (!base) throw new Error("Missing AI_GATEWAY in Worker environment.");
  return base.replace(/\/+$/, "");
}

async function postJSON(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// --------------------- Unified LLM caller via AI Gateway ---------------------
export async function callLLM(
  env: EnvReq,
  prompt: string,
  choice: LLMChoice,
  system = "You are a helpful, concise AI agent."
): Promise<string> {
  const base = cleanBase(env.AI_GATEWAY);
  const { provider, model } = choice;

  // Cloudflare AI Gateway provider mount points
  const mounts: Record<Exclude<Provider, "googleai" | "openrouter" | "replicate">, string> = {
    openai: `${base}/openai`,
    anthropic: `${base}/anthropic`,
    google: `${base}/google`, // Gemini via Gateway
  };

  if (provider === "openai") {
    const data = await postJSON(`${mounts.openai}/v1/chat/completions`, {}, {
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    });
    return data?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const data = await postJSON(`${mounts.anthropic}/v1/messages`, {
      "anthropic-version": "2023-06-01",
    }, {
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return data?.content?.[0]?.text ?? "";
  }

  if (provider === "google") {
    const data = await postJSON(`${mounts.google}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {}, {
      contents: [{ parts: [{ text: `${system}\n\nUser: ${prompt}` }] }],
    });
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // OpenRouter (direct, not through Gateway)
  if (provider === "openrouter") {
    const key = env.OPENROUTER_API_KEY;
    if (!key) throw new Error("Missing OPENROUTER_API_KEY");
    const data = await postJSON("https://openrouter.ai/api/v1/chat/completions",
      { Authorization: `Bearer ${key}` },
      { model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }
    );
    return data?.choices?.[0]?.message?.content ?? "";
  }

  // Replicate (simple chat wrapper; adjust for specific models if needed)
  if (provider === "replicate") {
    const key = env.REPLICATE_API_TOKEN;
    if (!key) throw new Error("Missing REPLICATE_API_TOKEN");
    const data = await postJSON("https://api.replicate.com/v1/chat/completions",
      { Authorization: `Bearer ${key}` },
      { model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }
    );
    return data?.choices?.[0]?.message?.content ?? "";
  }

  // googleai = direct Google AI Studio (Gemini) for UI code generation
  if (provider === "googleai") {
    if (!env.GOOGLE_AI_STUDIO_API_KEY) throw new Error("Missing GOOGLE_AI_STUDIO_API_KEY");
    // Use official Gemini endpoint (Studio uses Gemini under the hood)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${env.GOOGLE_AI_STUDIO_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\nUser: ${prompt}` }] }] }),
    });
    if (!res.ok) throw new Error(`Google AI Studio failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    // Expect text content (you can ask the model to return JSON for files)
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// --------------------- UI code generation helper (expects JSON file list) ---------------------
export async function generateUIWithGoogle(
  env: EnvReq,
  model: string,
  prompt: string
): Promise<{ files: Array<{ path: string; content: string }> }> {
  if (!env.GOOGLE_AI_STUDIO_API_KEY) throw new Error("Missing GOOGLE_AI_STUDIO_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${env.GOOGLE_AI_STUDIO_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Tip: You can add a system-style preamble by including it in `prompt`
    }),
  });
  if (!res.ok) throw new Error(`Google UI gen failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  // The model should be instructed to return JSON describing files.
  // If it returns plain text, we fail soft and return an empty list.
  try {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(text);
  } catch {
    return { files: [] };
  }
}
