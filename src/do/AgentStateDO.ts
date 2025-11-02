// src/do/AgentStateDO.ts
// Purpose: Durable Object for *resume-in-progress* state per user+agent.
// Exposes an internal mini-API your Worker can call: GET/PUT/DELETE /session

export interface SessionState {
  agentId: string;
  userId: string;
  step: "functional" | "style" | "llm" | "build" | "review";
  answers: Record<string, unknown>;
  updatedAt: number; // epoch ms
}

export class AgentStateDO {
  state: DurableObjectState;
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    this.storage = state.storage;
  }

  // Read current session snapshot (or null if none)
  async getSession(): Promise<SessionState | null> {
    return (await this.storage.get<SessionState>("session")) ?? null;
  }

  // Merge in new fields (upsert) and timestamp it
  async updateSession(patch: Partial<SessionState>): Promise<SessionState> {
    const now = Date.now();
    const current =
      (await this.storage.get<SessionState>("session")) ?? {
        agentId: "",
        userId: "",
        step: "functional",
        answers: {},
        updatedAt: now,
      };
    const next: SessionState = {
      ...current,
      ...patch,
      answers: { ...(current.answers || {}), ...(patch.answers || {}) },
      updatedAt: now,
    };
    await this.storage.put("session", next);
    return next;
  }

  // Delete the session (e.g., after a successful deploy)
  async clearSession(): Promise<void> {
    await this.storage.delete("session");
  }

  // Minimal internal API for your Worker to call via stub.fetch(...)
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });

    if (request.method === "GET" && url.pathname === "/session") {
      return json(await this.getSession());
    }
    if (request.method === "PUT" && url.pathname === "/session") {
      const patch = await request.json().catch(() => ({}));
      return json(await this.updateSession(patch));
    }
    if (request.method === "DELETE" && url.pathname === "/session") {
      await this.clearSession();
      return json({ ok: true });
    }
    return new Response("Not found", { status: 404 });
  }
}

