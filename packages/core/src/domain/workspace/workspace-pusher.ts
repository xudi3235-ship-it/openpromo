import type { ApiEnv } from "@core/helpers/api-env";
import {
  authenticateWithCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "@core/helpers/auth";
import { Pusher } from "@core/helpers/pusher";
import * as cookie from "cookie";

const USER_SESSION_LIMIT = 10;

export class WorkspacePusher extends Pusher {
  private _workspaceSlug: string = "default";
  private userWebSocketManager = new UserWebSocketManager();

  constructor(state: DurableObjectState, env: ApiEnv) {
    super(state, env);
  }

  get workspaceSlug() {
    return this._workspaceSlug;
  }

  init(workspaceSlug: string) {
    console.log(`Initializing WorkspacePusher for workspace: ${workspaceSlug}`);
    console.log(`Previous workspace: ${this._workspaceSlug}`);
    console.log(
      `Current sessions before init: ${this.userWebSocketManager.getTotalSessions()}`,
    );
    this._workspaceSlug = workspaceSlug;
  }

  protected override async onRequest(_request: Request): Promise<Response> {
    return Response.json({ message: "Workspace Pusher" });
  }

  protected override async onWebSocketDisconnect(ws: WebSocket): Promise<void> {
    console.log("Workspace Pusher: WebSocket disconnected");

    // Find and remove the WebSocket from the manager
    const userId = this.userWebSocketManager.getUserIdFromWebSocket(ws);
    if (userId) {
      this.userWebSocketManager.removeWebSocket(userId, ws);
      console.log(`Removed WebSocket for user ${userId}`);
    }
  }

  protected override async onWebSocketConnect(ws: WebSocket, request: Request) {
    const workspaceSlug = this.workspaceSlug;

    const cookieString = request.headers.get("cookie");

    if (!cookieString) {
      throw new Error("Cookie not found");
    }

    const cookies = cookie.parse(cookieString);

    const sessionCookie = cookies[WORKOS_SESSION_COOKIE_NAME];

    if (!sessionCookie) {
      throw new Error("Session cookie not found");
    }

    const result = await authenticateWithCookie({
      cookie: sessionCookie,
      withRefresh: false,
    });

    if (!result.authenticated) {
      throw new Error("Failed to authenticate session");
    }

    const userId = result.user.id;

    console.log(`Adding WebSocket for user ${userId}`);

    this.userWebSocketManager.addWebSocket(userId, ws);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connect",
        message: `Connected to workspace: ${workspaceSlug}`,
        timestamp: Date.now(),
        workspaceSlug,
      }),
    );

    await this.startPeriodicEvents(ws);
  }

  sendMessageToUser(userId: string, message: string) {
    console.log(
      `Looking for user ${userId} in workspace ${this.workspaceSlug}`,
    );
    console.log(
      `Total users in manager: ${this.userWebSocketManager.getTotalUsers()}`,
    );
    console.log(
      `Total sessions: ${this.userWebSocketManager.getTotalSessions()}`,
    );

    const webSockets = this.userWebSocketManager.getWebSocketsByUserId(userId);
    let sentCount = 0;
    for (const ws of webSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    }
    console.log(`Sent message to ${sentCount} sessions:`, message);
  }

  sendMessageToAllUsers(message: string) {
    console.log(`Sending to all users in workspace ${this.workspaceSlug}`);
    console.log(
      `Total users in manager: ${this.userWebSocketManager.getTotalUsers()}`,
    );
    console.log(
      `Total sessions: ${this.userWebSocketManager.getTotalSessions()}`,
    );

    const webSockets = this.userWebSocketManager.getAllWebSockets();
    let sentCount = 0;
    for (const ws of webSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    }
    console.log(
      `Sent message to ${sentCount} sessions from all users:`,
      message,
    );
  }

  protected override async onWebSocketMessage(ws: WebSocket, message: unknown) {
    const workspaceSlug = this.workspaceSlug;
    console.log(
      "Workspace Pusher: Message received for workspace",
      workspaceSlug,
      "- message:",
      message,
    );

    // Echo message back to sender (for now, can be extended for broadcasting)
    try {
      ws.send(
        JSON.stringify({
          type: "echo",
          message: message,
          timestamp: Date.now(),
          workspaceSlug,
        }),
      );
    } catch (error) {
      console.error("Failed to send echo message:", error);
    }
  }

  private async startPeriodicEvents(ws: WebSocket) {
    const workspaceSlug = this.workspaceSlug;
    let eventCount = 0;

    const periodicInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        eventCount++;
        const event = {
          type: "periodic",
          message: `Periodic event #${eventCount} from workspace ${workspaceSlug}`,
          timestamp: Date.now(),
          eventId: `event-${eventCount}`,
          workspaceSlug,
        };

        ws.send(JSON.stringify(event));
        console.log(
          `Sent periodic event ${eventCount} to workspace ${workspaceSlug}`,
        );
      } else {
        console.log("WebSocket closed, clearing periodic events");
        clearInterval(periodicInterval);
      }
    }, 10000); // 10 seconds

    console.log(`Started periodic events for workspace ${workspaceSlug}`);
  }
}

interface WebSocketSession {
  socket: WebSocket;
  createdAt: number;
}

class UserWebSocketManager {
  private userIdToWebSocketsMap: Map<string, WebSocketSession[]> = new Map();

  addWebSocket(userId: string, ws: WebSocket): void {
    const sessions = this.userIdToWebSocketsMap.get(userId) || [];
    console.log(`Adding WebSocket for user ${userId}:`, ws);

    // Check if we need to evict an old session
    if (sessions.length >= USER_SESSION_LIMIT) {
      // Sort by creation time (oldest first) and evict the oldest
      sessions.sort((a, b) => a.createdAt - b.createdAt);
      const oldestSession = sessions.shift();
      if (oldestSession) {
        this.evictSession(userId, oldestSession);
      }
    }

    // Add the new session
    const newSession: WebSocketSession = {
      socket: ws,
      createdAt: Date.now(),
    };
    sessions.push(newSession);
    this.userIdToWebSocketsMap.set(userId, sessions);

    console.log(
      `Now have ${sessions.length} sessions for user ${userId} (limit: ${USER_SESSION_LIMIT})`,
    );
    console.log(
      `Total users: ${this.getTotalUsers()}, Total sessions: ${this.getTotalSessions()}`,
    );
    console.log(`Session info:`, this.getSessionInfo());
  }

  private evictSession(userId: string, session: WebSocketSession): void {
    const ws = session.socket;
    if (ws.readyState === WebSocket.OPEN) {
      console.log(`Evicting oldest session for user ${userId}`);

      // Send graceful closure notification
      const evictionMessage = JSON.stringify({
        type: "session_evicted",
        message:
          "This session has been closed because you have exceeded the maximum number of concurrent sessions.",
        timestamp: Date.now(),
        reason: "max_sessions_exceeded",
        maxSessions: USER_SESSION_LIMIT,
      });

      try {
        ws.send(evictionMessage);
        // Give a brief moment for the message to be sent before closing
        setTimeout(() => {
          ws.close(1000, "Session limit exceeded");
        }, 100);
      } catch (error) {
        console.error("Failed to send eviction message:", error);
        ws.close(1000, "Session limit exceeded");
      }
    }
  }

  removeWebSocket(userId: string, ws: WebSocket): void {
    const sessions = this.userIdToWebSocketsMap.get(userId);
    if (sessions) {
      const index = sessions.findIndex((session) => session.socket === ws);
      if (index !== -1) {
        sessions.splice(index, 1);
        if (sessions.length === 0) {
          this.userIdToWebSocketsMap.delete(userId);
        } else {
          this.userIdToWebSocketsMap.set(userId, sessions);
        }
      }
    }
  }

  getWebSocketsByUserId(userId: string): Set<WebSocket> {
    const sessions = this.userIdToWebSocketsMap.get(userId) || [];
    return new Set(sessions.map((session) => session.socket));
  }

  getAllWebSockets(): Set<WebSocket> {
    const allWebSockets = new Set<WebSocket>();

    for (const sessions of this.userIdToWebSocketsMap.values()) {
      sessions.forEach((session) => {
        allWebSockets.add(session.socket);
      });
    }

    return allWebSockets;
  }

  getUserIdFromWebSocket(ws: WebSocket): string | undefined {
    for (const [userId, sessions] of this.userIdToWebSocketsMap.entries()) {
      if (sessions.some((session) => session.socket === ws)) {
        return userId;
      }
    }
    return undefined;
  }

  getTotalUsers(): number {
    return this.userIdToWebSocketsMap.size;
  }

  getTotalSessions(): number {
    let total = 0;
    for (const sessions of this.userIdToWebSocketsMap.values()) {
      total += sessions.length;
    }
    return total;
  }

  getSessionInfo(): Record<string, number> {
    const info: Record<string, number> = {};
    for (const [userId, sessions] of this.userIdToWebSocketsMap.entries()) {
      info[userId] = sessions.length;
    }
    return info;
  }
}
