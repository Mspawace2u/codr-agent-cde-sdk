// Shared environment + DTO types for Codr

export interface Env {
  AGENT_CACHE: KVNamespace;
  AGENT_REGISTRY_DB: D1Database;
  AGENT_ASSETS: R2Bucket;
  APP_URL: string;
  LOG_LEVEL: string;
  MAIL_FROM?: string;
  MAIL_REPLYTO?: string;
}

export type JTBDShort = string; // e.g., "Daily KPI summary"

export interface AgentRecord {
  id: string;
  name: string;
  jtbds?: JTBDShort;
  logic_yaml?: string;
  input_sources?: string;   // csv
  llm_models?: string;      // csv
  api_keys_required?: string; // csv
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackRecord {
  id?: number;
  agent_id: string;
  checkin_day: 1 | 3 | 7;
  notes?: string;
  submitted_at?: string;
}
