// src/services/websocket.ts
// Codr — Real-time WebSocket communication for live updates

export interface WebSocketMessage {
  type: 'progress' | 'phase_complete' | 'error' | 'complete' | 'status_update' | 'subscribe' | 'pong' | 'get_status' | 'update_progress' | 'connected';
  agentId?: string;
  data?: any;
  timestamp: number;
  connectionId?: string;
}

export interface WebSocketConnection {
  websocket: WebSocket;
  agentId: string;
  userId?: string;
}

export class WebSocketManager {
  private connections = new Map<string, WebSocketConnection>();
  private heartbeatInterval: number = 30000; // 30 seconds

  constructor(private env: { AGENT_STATE: DurableObjectNamespace }) {
    // Start heartbeat monitoring
    this.startHeartbeat();
  }

  private startHeartbeat() {
    setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        try {
          connection.websocket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        } catch (error) {
          // Connection is dead, clean it up
          this.connections.delete(connectionId);
        }
      });
    }, this.heartbeatInterval);
  }

  handleWebSocket(websocket: WebSocket, env: any) {
    const connectionId = crypto.randomUUID();

    websocket.accept();

    // Send welcome message
    websocket.send(JSON.stringify({
      type: 'connected',
      connectionId,
      timestamp: Date.now()
    }));

    // Handle incoming messages
    websocket.addEventListener('message', async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data.toString());

        switch (message.type) {
          case 'subscribe':
            // Subscribe to agent updates
            if (message.agentId) {
              this.connections.set(connectionId, {
                websocket,
                agentId: message.agentId,
                userId: message.data?.userId
              });
            }
            break;

          case 'pong':
            // Heartbeat response - connection is alive
            break;

          default:
            // Handle other message types
            await this.handleMessage(message, connectionId);
        }
      } catch (error) {
        websocket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          timestamp: Date.now()
        }));
      }
    });

    // Handle disconnection
    websocket.addEventListener('close', () => {
      this.connections.delete(connectionId);
    });

    websocket.addEventListener('error', () => {
      this.connections.delete(connectionId);
    });
  }

  private async handleMessage(message: WebSocketMessage, connectionId: string) {
    // Handle various message types
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'get_status':
        if (message.agentId) {
          const status = await this.getAgentStatus(message.agentId);
          if (status) {
            connection.websocket.send(JSON.stringify(status));
          }
        }
        break;

      case 'update_progress':
        if (message.agentId) {
          await this.broadcastToAgent(message.agentId, message);
        }
        break;
    }
  }

  async broadcastToAgent(agentId: string, message: WebSocketMessage): Promise<void> {
    // Send to all connected clients for this agent
    const agentConnections = Array.from(this.connections.values())
      .filter(conn => conn.agentId === agentId);

    const messageStr = JSON.stringify(message);

    agentConnections.forEach(connection => {
      try {
        connection.websocket.send(messageStr);
      } catch (error) {
        // Remove dead connections
        const deadConnectionId = Array.from(this.connections.entries())
          .find(([, conn]) => conn === connection)?.[0];
        if (deadConnectionId) {
          this.connections.delete(deadConnectionId);
        }
      }
    });

    // Also store in Durable Object for persistence
    const agentStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));

    await agentStub.fetch("https://do/status", {
      method: "POST",
      body: JSON.stringify(message)
    });
  }

  async getAgentStatus(agentId: string): Promise<WebSocketMessage | null> {
    // First check if we have active connections
    const hasActiveConnections = Array.from(this.connections.values())
      .some(conn => conn.agentId === agentId);

    // Get latest status from Durable Object
    const agentStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));
    const response = await agentStub.fetch("https://do/status");
    const data = await response.json();

    if (data && typeof data === 'object') {
      const dataObj = data as any;
      return {
        type: dataObj.type || 'status_update',
        agentId: dataObj.agentId || agentId,
        timestamp: dataObj.timestamp || Date.now(),
        data: {
          ...(dataObj.data || {}),
          hasActiveConnections
        }
      } as WebSocketMessage;
    }

    return null;
  }

  getConnectionCount(agentId?: string): number {
    if (agentId) {
      return Array.from(this.connections.values())
        .filter(conn => conn.agentId === agentId).length;
    }
    return this.connections.size;
  }
}

// Factory function
export function createWebSocketManager(env: { AGENT_STATE: DurableObjectNamespace }): WebSocketManager {
  return new WebSocketManager(env);
}