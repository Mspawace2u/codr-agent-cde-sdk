// Creates a minimal agent repo scaffold and stores it in R2 as a text bundle.
// The README always includes a Deploy-to-Cloudflare button; if repoUrl is
// unavailable, the link is a clear placeholder.

export interface BundleAgentSpec {
  id: string;
  subdomain: string;        // used as Worker name by default
  agent_name: string;
  jtbds_short: string;      // 2–3 word description
  llm_provider: string;
  llm_model: string;
  repoUrl?: string;         // if Sync-to-GitHub was used
}

export async function createAgentBundle(env: any, spec: BundleAgentSpec) {
  const now = new Date();
  const prefix = `bundles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${prefix}/${spec.id}.txt`;

  const deployTarget =
    spec.repoUrl && spec.repoUrl.startsWith("http")
      ? spec.repoUrl
      : "REPLACE_WITH_YOUR_PUBLIC_GIT_REPO_URL";

  const readme = `# ${spec.agent_name}

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=${deployTarget})

**Job:** ${spec.jtbds_short}

## Quick Deploy
- Click the button above.
- Cloudflare will clone the repo, detect bindings from \`wrangler.toml\`, and prompt for any missing secrets.
- First deploy seeds secrets; future pushes auto-redeploy.

## Manual
\`\`\`bash
npm i
npx wrangler d1 migrations apply agent_registry_db
npx wrangler dev
npx wrangler deploy
\`\`\`

## Cloudflare resources
- KV: \`AGENT_CACHE\`
- D1: \`agent_registry_db\`
- R2: \`agent_assets\`

## Secrets needed
- ${spec.llm_provider.toUpperCase()}_API_KEY
- MAILCHANNELS_API_KEY (optional for check-ins)
`;

  const wrangler = `name = "${spec.subdomain}"
main = "src/agent.ts"
compatibility_date = "2025-10-23"

[vars]
LLM_PROVIDER = "${spec.llm_provider}"
LLM_MODEL = "${spec.llm_model}"
`;

  const agentTs = `export default {
  async fetch(_req: Request, _env: any) {
    return new Response("Hello from ${spec.agent_name} — JTBD: ${spec.jtbds_short}", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};`;

  const bundle = [
    "---README.md---",
    readme,
    "---wrangler.toml---",
    wrangler,
    "---src/agent.ts---",
    agentTs,
    ""
  ].join("\n");

  await env.AGENT_ASSETS.put(key, new Blob([bundle], { type: "text/plain" }));
  return key;
}
