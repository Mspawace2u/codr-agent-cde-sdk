-- 🧱 001_init.sql (superset)
-- D1 schema for Codr: agent registry + style, wildcard routing, events, assets

PRAGMA foreign_keys = ON;

-- Registry of agents created by Codr
CREATE TABLE IF NOT EXISTS agents (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  subdomain         TEXT,                 -- e.g., agent-id for agent-id.vibecodedit.xyz
  jtbds             TEXT,                 -- short description (2–3 words)
  logic_yaml        TEXT,                 -- YAML of LLM logic/spec
  input_sources     TEXT,                 -- comma-separated or JSON
  llm_models        TEXT,                 -- JSON map of model-per-task
  api_keys_required TEXT,                 -- comma-separated or JSON
  visual_style      TEXT,                 -- JSON: theme/palette/font/vibe/motion/favourite app/screenshots
  frontend_framework TEXT,                -- "react" | "vite"
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup for wildcard routing
CREATE INDEX IF NOT EXISTS idx_agents_subdomain ON agents(subdomain);

-- Post-deploy check-ins (Day 1 / 3 / 7)
CREATE TABLE IF NOT EXISTS feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id     TEXT NOT NULL,
  checkin_day  INTEGER,                   -- 1 / 3 / 7
  notes        TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_agent ON feedback(agent_id);

-- Build/preview/deploy/error log (useful for debugging + analytics)
CREATE TABLE IF NOT EXISTS agent_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id  TEXT NOT NULL,
  kind      TEXT NOT NULL,                -- "build" | "preview" | "deploy" | "error"
  detail    TEXT,                         -- JSON payload (status, message, etc.)
  at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- References to R2-stored assets (screenshots, UI bundles)
CREATE TABLE IF NOT EXISTS agent_assets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id  TEXT NOT NULL,
  r2_key    TEXT NOT NULL,               -- e.g., agent_assets/<agentId>/<file>
  kind      TEXT NOT NULL,               -- "screenshot" | "bundle" | "other"
  at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
