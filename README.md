# Codr Agent CDE SDK 🚀

### AI-Powered App Generator – Build Chainable Micro-Agents on Cloudflare

**Codr** is a neurodivergent-friendly AI platform that transforms your workflow descriptions into **production-ready web applications**. Using advanced AI code generation, it creates React/Vite apps with custom styling, deploys them instantly to Cloudflare Workers, and provides live previews - all through an intuitive chat interface.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Mspawace2u/codr-agent-cde-sdk)

## ✨ Enterprise Features

### 🤖 AI Code Generation Pipeline
- **Phase-based Development**: Planning → Foundation → Core → Styling → Integration → Optimization
- **Google AI Studio Integration**: Advanced code generation using Gemini models
- **Multi-LLM Support**: Anthropic Claude, OpenAI GPT, Google Gemini via AI Gateway
- **Template System**: Pre-built React/Vite app templates (Todo, Dashboard, etc.)

### 🚀 Production Deployment
- **Workers for Platforms**: One-click deployment with isolated multi-tenant apps
- **Wildcard Subdomains**: Each app gets its own subdomain (app-123.yourdomain.com)
- **Live Previews**: Container-based testing before deployment
- **GitHub Export**: Automatic repository creation and code versioning

### 🔐 Enterprise Security & Auth
- **OAuth Integration**: Google & GitHub authentication
- **Advanced QA System**: Automated linting, type checking, security scanning
- **Real-time Updates**: WebSocket communication for live progress tracking
- **Access Control**: Email-based authorization and session management

### 🎨 ND-Friendly UX
- **6-Question Intake**: Streamlined workflow capture
- **Style Customization**: Theme, colors, fonts, motion effects
- **Progress Tracking**: Visual feedback throughout the process
- **Error Recovery**: Intelligent retry and correction mechanisms

---

## ⚙️ Before You Deploy

Before you click **Deploy to Cloudflare**, make sure you have these accounts and services ready.

---

### 🧱 Must-Have Accounts & Services
| # | Service | Tier | Purpose | Notes |
|---|----------|------|----------|-------|
| 1 | **Cloudflare** | Free | Base account for Workers + DNS | [Sign up free →](https://dash.cloudflare.com) |
| 2 | **Cloudflare Workers + Workers Platform** | Paid | Hosts and orchestrates automations, logic, and UI for Codr + client apps | Platform owner requires paid plan |
| 3 | **R2 Buckets** | Free (Generous Tier) | Stores assets, bundles, transcripts, and media | Billing must be enabled |
| 4 | **Domain Name** | Paid / Verified | Needed for app routing and wildcard subdomains | Purchase or verify via Cloudflare |
| 5 | **Google AI Studio API** | Free w/ billing method | Generates UI and assists in vibe-coding logic | [Get API key →](https://aistudio.google.com/app/apikey) |
| 6 | **GitHub** | Free | Hosts your code repo | Auto-connects during deploy |
| 7 | **Email Address** | Free / Paid | Authenticates user access, sends check-ins, and alert loops | Required for login and progress tracking |

---

### 💎 Logic Models (LLM Options)

Codr defaults to **Gemini 2.5** (via Google AI Studio) for vibe-coding logic and app generation.  
You can optionally connect other models for specific strengths or preferences:

| Provider | Typical Use | Notes |
|-----------|--------------|-------|
| **OpenAI API Key** | Coding, frameworks, and persona libraries | Paid plan required |
| **Anthropic / Claude API Key** | Copywriting, ND-optimized logic | Optional |
| **Replicate API Key** | Image, avatar, video, or voice generation | Required for motion & visual agents |

---

### 📩 Mail & Notifications

If your build uses **Loops** or **MailChannels** for alert routing or app check-ins, these keys are required — not optional:

| Key | Purpose | Notes |
|-----|----------|-------|
| **MailChannels API Key** | Sends ND-friendly alerts and daily/weekly reminders | Used in code by default |
| **Authorized Email** | Access and registration on platform | Required for login and alert routing |

---

## 🚀 Quick Deploy

1. Log into Cloudflare (`wrangler login`)
2. Verify resources: `wrangler d1 list`, `wrangler kv:namespace list`
3. Deploy your worker:

        npm run deploy

4. Visit `https://vibecodedit.xyz` (or your own domain) and start vibe-coding your first agent 🎨

> **Pro Tip:** If deployment fails, recheck your bindings and secrets in `wrangler.jsonc` before panic-scrolling support threads. Most errors come from missing keys or mismatched IDs.

---

## 🗺️ How Your Cloudflare Resources Map to the Code

When you click **Deploy to Cloudflare**, the platform automatically provisions and binds three key resources.  
Here’s how they connect to your code and power your micro-apps:

| Resource | Purpose | What It Powers |
|-----------|----------|----------------|
| **KV Namespace** | Caches quick lookup data | Makes wildcard subdomain routing instant |
| **D1 Database** | Stores agent registry, question sets, and style answers | Saves progress and enables “resume later” |
| **R2 Bucket** | Holds generated bundles, uploaded screenshots, and assets | Keeps design inspiration and app UI files |

You don’t need to manually create these unless you’re replicating Codr for a team environment or customizing routing.  
Each resource maps automatically in `wrangler.jsonc` under bindings:
- `KV → AGENT_CACHE`
- `D1 → AGENT_REGISTRY_DB`
- `R2 → AGENT_ASSETS`

---

## 💡 What You Get
- **Chat UI (React, minimalist)** → 6-question flow → instant agent bundle  
- **Worker backend** → KV → D1 fallback, R2 bundles + Day 1/3/7 email reminders  
- **Sync to GitHub** (token) or **Download ZIP** fallback  
- **LLM picker** with smart defaults: Anthropic • Gemini • OpenAI • OpenRouter • Replicate (AV)  
- **Wildcard routing ready:** `*.vibecodedit.xyz/*` → single router Worker  

---

## 🗂 Repo Layout

```txt
README.md
wrangler.jsonc            # Worker & asset configuration (routes, bindings)
package.json
src/
  migrations/001_init.sql  # D1 schema (agents table includes style + framework)
  core/persona.core.yaml   # Functional + style questions & behaviour
  lib/types.ts
  lib/llm.ts               # Unified LLM logic (AI Gateway + Google AI Studio)
  lib/style-intake.ts      # Helpers for style prompts & framework choice
  worker.ts                # Router Worker & API endpoints
web/
  index.html
  style.css
  builder.js               # UI for answering questions & posting to API
```

---

## ⚙️ Prerequisites

Before you deploy, make sure you have:

- ✅ A **Cloudflare account** with **Workers**, **D1**, **R2**, and **KV** enabled  
- ✅ **Node 18+** installed locally (for testing or manual builds)  
- ✅ A **verified domain** on Cloudflare (e.g., `yourdomain.xyz`)  

Add this CNAME record in your Cloudflare dashboard for your 'wildcard' workers:

```txt
Type:  CNAME
Name:  *
Target: yourdomain.xyz
TTL: Auto
Proxy: On (orange cloud)

This wildcard route allows every new micro-agent you build with Codr to automatically get its own subdomain like agent123.yourdomain.xyz.
```

---

## 🔐 Required Environment Variables

| Variable | Type | Description |
|-----------|------|-------------|
| `AI_GATEWAY` | Worker Var | Your single Cloudflare AI Gateway URL. All Anthropic, OpenAI, and Gemini requests funnel through here. |
| `GOOGLE_AI_STUDIO_API_KEY` | Secret | API key for Google AI Studio (used for front-end generation). |
| `OPENROUTER_API_KEY` | Secret | Optional key for multi-model routing (Claude / OpenAI / Gemini). |
| `REPLICATE_API_TOKEN` | Secret | Optional key for Replicate (audio, video, avatar, or image tasks). |
| `MAILCHANNELS_API_KEY` | Secret | Used for ND-friendly email alerts + performance check-ins. (Required for auth + alert features.) |

---

## 🤖 LLM Defaults

Codr automatically inspects your “job to be done” and selects a logic model stack based on task type and context.  
Defaults are pre-tuned for balance between capability and cost:

| Provider | Default | Budget Option |
|-----------|----------|---------------|
| **Anthropic** | `claude-4-sonnet` (balanced generalist) | `claude-3.7-sonnet` |
| **OpenAI** | `gpt-5` (analysis & logic) | `gpt-5-mini` |
| **Gemini** | `gemini-2.5-pro` (vision/audio + UI builds) | `gemini-1.5-flash` |
| **Google AI Studio** | `code-davinci-ui` (front-end generator) | — |
| **OpenRouter** | Mirrors chosen model | `openrouter/openai/gpt-5-mini` |
| **Replicate** | `elevenlabs-voice` (voice, AV, motion) | — |

---

## 🌐 Routing & Domains

Each Codr app you create lives inside your Cloudflare environment with automatic routing baked in.

When you deploy:

| Route Type | Purpose | Example |
|-------------|----------|----------|
| **Root Domain** | The main Codr entry point and vibe-coding interface | `https://yourdomain.xyz` |
| **Wildcard Subdomains** | Auto-spins a unique preview for every micro-agent or app | `https://agent123.yourdomain.xyz` |
| **API Paths** | Handle logic calls and data persistence | `/api/agents`, `/api/assets`, `/api/style` |

### 🧭 How It Works

- **Wildcard routing** is powered by your CNAME record and Cloudflare DNS.  
  Once verified, every new agent you deploy instantly resolves to its own subdomain.  
- All app logic, UI assets, and user data are served through your Worker bindings (KV, D1, R2).  
- No manual routing setup or DNS edits after first deploy.

### 🧩 Domain Ownership Options

| Use Case | Recommendation |
|-----------|----------------|
| **Platform Owner / Builder** | Maintain paid **Workers Platform** plan and host client apps from your verified domain. |
| **Client / Individual User** | Connect your own Cloudflare domain (or subdomain) to the parent platform for easy self-hosted access. |

### ⚡️ Why This Matters

This setup ensures every Codr app has:
- Instant load speed via Cloudflare’s edge network  
- Seamless API calls (no CORS headaches)  
- Auto-generated sharing links for testing, feedback, and collaboration  

Your domain becomes both your **creative studio** *and* your **delivery engine** — one click, full deploy.

---

## 🖥️ UI Flow

1. Visit `https://vibecodedit.xyz` (replace with your domain).  
2. **Answer the six functional questions** about the agent’s goal, steps, engagement, data, triggers, and follow-ups.  
3. **Define the look & feel**: theme, color palette, font, design vibe, motion effects, favorite app, and optional inspiration images.  
4. Review your summary, choose **Code it** or **Fix it**.  
5. Codr chooses React or Vite based on your style answers, generates the agent and its UI, registers it in D1, and assigns it a subdomain.  
6. Your agent is live at `https://<agent_id>.vibecodedit.xyz`.

Day 1/3/7 check-ins via email are sent automatically.

---

## 🧯 Troubleshooting

- **KV/D1/R2 issues:** ensure IDs match your resources in `wrangler.jsonc`.  
- **Schema errors:** rerun migrations.  
- **Missing emails:** verify MailChannels configuration.  
- **API key greyed out:** set the corresponding secret.  
- **404 subdomain:** confirm wildcard route mapping.

---

## 🎨 ND-Friendly Style Guide

- Use **short, punchy copy** and one action per screen.  
- Prioritize **clear hierarchy** with contrasting colors; avoid clutter.  
- Limit pages to **60–85%** of the viewport, with generous whitespace.  
- Support *light* and *dark* themes.  
- Motion is optional; allow the user to choose none, subtle element animation, or page transitions.  
- Offer optional **favorite app** and **design inspiration uploads** so Codr can learn from designs that energize the user.

---

## 🧭 Closure Line

> Here are your next micro-steps to make progress:  
✅ Are we good here?  
🚀 If so, get at it — and check back in when you’ve got something epic to show.

---

This README reflects the unified UI‑plus‑Worker approach, the extended intake with style questions, and the ND‑optimised design principles. It should give anyone cloning the repo a clear path to deploy and use the platform.
