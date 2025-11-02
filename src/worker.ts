/**
 * 🚀 Codr Router Worker (Workers + UI)
 *
 * - Serves the Codr UI at your apex domain (e.g. https://vibecodedit.xyz)
 * - Handles API routes under /api/*
 * - Resolves wildcard agent subdomains via KV (AGENT_CACHE)
 * - Stores agent definitions in D1 (AGENT_REGISTRY_DB)
 * - Exports Durable Object AgentStateDO for per-agent state
 * - Exposes Dispatcher + Workers AI + Gateway bindings for modular app comms
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { html } from "hono/html";
import { nanoid } from "nanoid";
import { getSession, putSession, sessionKey } from "./lib/session";
import { AgentStateDO } from "./do/AgentStateDO";
import { createCodeGenerator } from "./core/code-generator";

type MaybeKV = KVNamespace | undefined;

interface Env {
  // Data & cache
  AGENT_CACHE: KVNamespace;
  AGENT_REGISTRY_DB: D1Database;
  AGENT_ASSETS: R2Bucket;
  SESSION_KV?: MaybeKV;

  // Core platform bindings
  AGENT_STATE: DurableObjectNamespace; // resume-in-progress DO
  DISPATCHER: any;                     // cross-app routing namespace

  // AI & Gateway
  AI: any;                             // Workers AI binding
  CLOUDFLARE_AI_GATEWAY: string;       // Gateway name or URL
  GOOGLE_AI_STUDIO_API_KEY?: string;   // optional extra key

  // Config
  APP_URL: string;
  LOG_LEVEL?: string;

  // Optional mail vars
  MAIL_FROM?: string;
  MAIL_REPLYTO?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for API; UI is same-origin
app.use("/api/*", cors());

// ----------------------
// 🌐 UI (apex)
// ----------------------
app.get("/", async (c) => {
  return c.html(html`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Codr — Agent Builder</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href="/web/style.css" />
        <style>
          body {
            background: #0d0d0d;
            color: #f4f4f4;
            font-family: system-ui, sans-serif;
          }
          .wrap {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
          }
          .cta {
            background: linear-gradient(90deg, #a855f7, #ec4899);
            color: #fff;
            padding: 0.8rem 1.2rem;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 0 25px rgba(168, 85, 247, 0.6);
          }
          .cta:hover {
            transform: scale(1.05);
            box-shadow: 0 0 35px rgba(236, 72, 153, 0.8);
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <main>
            <h1>🧩 Codr — Build Your Agent Army</h1>
            <p>Chat your workflow → Ship your agent → Deploy to Cloudflare in minutes.</p>
            <p>
              <button class="cta" onclick="window.location.href='/api/hello'">
                Ping API
              </button>
            </p>
            <p style="opacity:0.7">
              <small>UI shell is minimal for v1; full web UI lives in your compiled web app</small>
            </p>
          </main>
        </div>
        <script src="/web/main.js" type="module"></script>
      </body>
    </html>
  `);
});

// Fallback static files
app.get("/web/*", async (c) =>
  c.text("Static web assets not bundled in Worker. (web/* files exist in repo)", 404)
);

// ----------------------
// ⚙️ API
// ----------------------

// Health check
app.get("/api/hello", (c) => c.json({ message: "Codr API online ✅" }));

// Create or update an agent record
app.post("/api/agents", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = body.id || nanoid(10);
  const now = new Date().toISOString();

  await c.env.AGENT_REGISTRY_DB
    .prepare(
      `INSERT INTO agents (id,name,jtbds,logic_yaml,input_sources,llm_models,api_keys_required,visual_style,frontend_framework,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?, ?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         jtbds=excluded.jtbds,
         logic_yaml=excluded.logic_yaml,
         input_sources=excluded.input_sources,
         llm_models=excluded.llm_models,
         api_keys_required=excluded.api_keys_required,
         visual_style=excluded.visual_style,
         frontend_framework=excluded.frontend_framework,
         updated_at=excluded.updated_at`
    )
    .bind(
      id,
      body.name ?? "",
      body.jtbds ?? "",
      body.logic_yaml ?? "",
      body.input_sources ?? "",
      body.llm_models ?? "",
      body.api_keys_required ?? "",
      JSON.stringify(body.visual_style ?? {}),
      body.frontend_framework ?? "vite",
      now,
      now
    )
    .run();

  await c.env.AGENT_CACHE.put(
    `agent:${id}`,
    JSON.stringify({ id, name: body.name ?? "", subdomain: id })
  );

  // If this is a new agent creation with full requirements, start code generation
  if (!body.id && body.name && body.jtbds) {
    try {
      const codeGenerator = createCodeGenerator({
        AI_GATEWAY: c.env.CLOUDFLARE_AI_GATEWAY,
        GOOGLE_AI_STUDIO_API_KEY: c.env.GOOGLE_AI_STUDIO_API_KEY,
        AGENT_STATE: c.env.AGENT_STATE
      });

      // Start async code generation
      c.executionCtx.waitUntil(
        codeGenerator.generateApp(body, id).then(result => {
          console.log(`Code generation completed for agent ${id}`, result);
        }).catch(error => {
          console.error(`Code generation failed for agent ${id}:`, error);
        })
      );
    } catch (error) {
      console.error("Failed to start code generation:", error);
    }
  }

  return c.json({ ok: true, id });
});

// Feedback
app.post("/api/feedback", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  await c.env.AGENT_REGISTRY_DB
    .prepare(`INSERT INTO feedback (agent_id,checkin_day,notes) VALUES (?,?,?)`)
    .bind(body.agent_id ?? "", Number(body.checkin_day ?? 0), body.notes ?? "")
    .run();
  return c.json({ ok: true });
});

// 🔐 Session ping (safe-noop if SESSION_KV isn’t bound)
app.get("/api/session/ping", async (c) => {
  const sessKV = c.env.SESSION_KV as MaybeKV;
  if (!sessKV) return c.json({ ok: true, note: "SESSION_KV not configured" });

  const key = sessionKey(c.req.header("host") || "");
  const data = await getSession(sessKV, key);
  data.pings = (data.pings || 0) + 1;
  await putSession(sessKV, key, data);
  return c.json({ ok: true, key, data });
});

// Resume-in-progress session routes via Durable Object
app.post("/api/session/save", async (c) => {
  const { userId, agentId, step, answers } = await c.req.json().catch(() => ({}));
  if (!userId || !agentId) return c.json({ error: "Missing ids" }, 400);

  const stub = c.env.AGENT_STATE.get(c.env.AGENT_STATE.idFromName(`${userId}:${agentId}`));
  const res = await stub.fetch("https://do/session", {
    method: "PUT",
    body: JSON.stringify({ userId, agentId, step, answers })
  });
  return c.json(await res.json());
});

app.get("/api/session", async (c) => {
  const userId = c.req.query("userId") || "";
  const agentId = c.req.query("agentId") || "";
  if (!userId || !agentId) return c.json({ error: "Missing ids" }, 400);

  const stub = c.env.AGENT_STATE.get(c.env.AGENT_STATE.idFromName(`${userId}:${agentId}`));
  const res = await stub.fetch("https://do/session");
  return c.json(await res.json());
});

// ----------------------
// 🌐 Wildcard subdomain → agent resolver
// ----------------------
app.get("*", async (c) => {
  const host = c.req.header("host") || "";
  const parts = host.split(".");
  const sub = parts.length > 2 ? parts[0] : "";

  if (!sub) return c.text("Not found. Did you have MCP Codr publish it?", 404);

  const cached = await c.env.AGENT_CACHE.get(`agent:${sub}`);
  if (cached) {
    const agent = JSON.parse(cached);
    return c.json({ message: `Agent ${sub} active`, data: agent });
  }

  return c.text(`Agent ${sub} not found in Codr registry`, 404);
});

// ----------------------
// 🔮 AI Example (optional test endpoint)
// ----------------------
app.post("/api/ai/test", async (c) => {
  try {
    const { prompt } = await c.req.json();
    const aiRes = await c.env.AI.run(
      "@cf/meta/llama-3-8b-instruct",
      { prompt },
      { gateway: c.env.CLOUDFLARE_AI_GATEWAY }
    );
    const data = await aiRes.json();
    return c.json({ ok: true, data });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

// ----------------------
// Auth Routes (OAuth)
// ----------------------
app.get("/api/auth/google", async (c) => {
  // Redirect to Google OAuth
  const authUrl = `https://accounts.google.com/oauth/authorize?${new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${c.env.APP_URL}/api/auth/callback/google`,
    scope: "openid email profile",
    response_type: "code",
    state: "google"
  })}`;
  return c.redirect(authUrl);
});

app.get("/api/auth/github", async (c) => {
  // Redirect to GitHub OAuth
  const authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID || "",
    redirect_uri: `${c.env.APP_URL}/api/auth/callback/github`,
    scope: "user:email",
    state: "github"
  })}`;
  return c.redirect(authUrl);
});

app.get("/api/auth/callback/google", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "No code provided" }, 400);

  // Exchange code for token and get user info
  // This would use the OAuth service we created
  return c.json({ success: true, provider: "google" });
});

app.get("/api/auth/callback/github", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "No code provided" }, 400);

  // Exchange code for token and get user info
  // This would use the OAuth service we created
  return c.json({ success: true, provider: "github" });
});

// ----------------------
// WebSocket Routes (Real-time updates)
// ----------------------
app.get("/api/ws/:agentId", async (c) => {
  const agentId = c.req.param("agentId");

  // Get latest status from Durable Object
  const agentStub = c.env.AGENT_STATE.get(c.env.AGENT_STATE.idFromName(agentId));
  const statusResponse = await agentStub.fetch("https://do/status");
  const status = await statusResponse.json();

  return c.json(status || { status: "unknown" });
});

// ----------------------
// QA Routes (Code Quality)
// ----------------------
app.post("/api/qa/analyze", async (c) => {
  const { files } = await c.req.json();

  // This would use the QA service to analyze code quality
  const qaResult = {
    passed: true,
    score: 85,
    issues: [],
    summary: { errors: 0, warnings: 2, suggestions: 3 }
  };

  return c.json(qaResult);
});

// ----------------------
// Build Routes (App Building)
// ----------------------
app.post("/api/build", async (c) => {
  const { appId, files, framework, dependencies } = await c.req.json();

  if (!appId || !files || !framework) {
    return c.json({ error: "Missing required fields: appId, files, framework" }, 400);
  }

  try {
    // Import build service dynamically to avoid circular dependencies
    const { createBuildService } = await import("./services/build");
    const buildService = createBuildService(c.env);

    const buildRequest = {
      appId,
      files,
      framework,
      dependencies: dependencies || {}
    };

    const result = await buildService.buildApp(buildRequest);

    // Store build result in KV for later retrieval
    await c.env.AGENT_CACHE.put(
      `build:${appId}`,
      JSON.stringify(result),
      { expirationTtl: 3600 } // 1 hour
    );

    return c.json(result);
  } catch (error) {
    return c.json({ error: `Build failed: ${error.message}` }, 500);
  }
});

app.get("/api/build/:appId", async (c) => {
  const appId = c.req.param("appId");

  try {
    const buildData = await c.env.AGENT_CACHE.get(`build:${appId}`);
    if (!buildData) {
      return c.json({ error: "Build not found" }, 404);
    }

    return c.json(JSON.parse(buildData));
  } catch (error) {
    return c.json({ error: `Failed to retrieve build: ${error.message}` }, 500);
  }
});

// ----------------------
// Exports
// ----------------------
export default app;
export { AgentStateDO };
