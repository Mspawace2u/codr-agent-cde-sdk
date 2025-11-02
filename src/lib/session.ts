// Minimal session helper backed by KV (SESSION_KV)
export async function getSession(kv: KVNamespace, key: string) {
  const raw = await kv.get(`sess:${key}`);
  return raw ? JSON.parse(raw) : {};
}

export async function putSession(kv: KVNamespace, key: string, data: any, ttlSeconds = 3600) {
  await kv.put(`sess:${key}`, JSON.stringify(data), { expirationTtl: ttlSeconds });
}

export function sessionKey(host: string, userHint = "anon") {
  const base = host?.split(":")[0] || "local";
  return `${base}:${userHint}`;
}
