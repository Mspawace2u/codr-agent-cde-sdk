// Seeds a demo agent row into D1 using Cloudflare D1 HTTP (run from your local once).
// Replace ACCOUNT_ID and DB binding name if needed, or run a manual INSERT via dashboard.

import fetch from "node-fetch";

const ACCOUNT_ID = "REPLACE_WITH_CF_ACCOUNT_ID";
const DB = "agent_registry_db"; // D1 name
const TOKEN = process.env.CF_API_TOKEN; // create a temporary API token if you want to run this

if (!TOKEN) {
  console.error("Missing CF_API_TOKEN env var");
  process.exit(1);
}

const SQL = `
INSERT INTO agents (id, name, jtbds, logic_yaml, input_sources, llm_models, api_keys_required)
VALUES ('demo-123', 'Demo Agent', 'Daily KPI', 'llm: claude-4-sonnet', 'email,calendar', 'claude-4-sonnet', 'ANTHROPIC_API_KEY');
`;

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB}/data/sql`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ sql: SQL })
});

const out = await res.json();
console.log(JSON.stringify(out, null, 2));
