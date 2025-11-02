-- 🧱 002_add_agent_tasks.sql (optional)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id   TEXT NOT NULL,
  task_key   TEXT NOT NULL,               -- e.g., 'ingest', 'summarize', 'rewrite'
  label      TEXT,                        -- human name shown in UI
  provider   TEXT,                        -- 'openai' | 'anthropic' | 'google' | 'replicate' | 'openrouter'
  model      TEXT,                        -- model id
  prompt     TEXT,                        -- canonical prompt JSON or text
  tools      TEXT,                        -- JSON array of tools/functions
  position   INTEGER,                     -- step order in the chain
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_order ON agent_tasks(agent_id, position);
