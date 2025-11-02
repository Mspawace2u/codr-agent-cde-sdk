// Quick check: prints whether required bindings/secrets exist.
const REQUIRED = {
  vars: ["APP_URL"],
  kv: ["AGENT_CACHE", "SESSION_KV"],
  d1: ["AGENT_REGISTRY_DB"],
  r2: ["AGENT_ASSETS"],
  secrets: [
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY",
    "OPENROUTER_API_KEY", "REPLICATE_API_TOKEN", "MAIL_FROM"
  ]
};

console.log("=== Codr environment sanity ===");
console.log("- Bindings declared in wrangler.toml? (manual check in repo)");
console.log("- Secrets set in Cloudflare? (dashboard → Workers → Settings → Variables)");

console.log("\nExpect to configure:");
console.log("KV:", REQUIRED.kv.join(", "));
console.log("D1:", REQUIRED.d1.join(", "));
console.log("R2:", REQUIRED.r2.join(", "));
console.log("Vars:", REQUIRED.vars.join(", "));
console.log("Secrets:", REQUIRED.secrets.join(", "));

console.log("\nTip: First deploy via dashboard will prompt for any missing secrets/IDs.");
