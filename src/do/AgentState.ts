export class AgentState {
  state: DurableObjectState;
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState, _env: any) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname === "/set") {
      const { key, value } = await req.json();
      await this.storage.put(key, value);
      return new Response("ok");
    }
    if (url.pathname === "/get") {
      const key = url.searchParams.get("key") || "";
      const value = await this.storage.get(key);
      return new Response(JSON.stringify({ key, value }), { headers: { "content-type": "application/json" } });
    }
    return new Response("AgentState DO alive", { status: 200 });
  }
}
