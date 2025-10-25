import type { ApiEnv } from "@core/helpers/api-env";
import { Pusher } from "@core/helpers/pusher";
import type {
  WorkspaceNotification,
  WorkspaceNotificationRecord,
} from "./notifications";
import { WORKSPACE_PUSHER_USER_HEADER } from "./workspace-pusher-headers";

const USER_SESSION_LIMIT = 10;
const NOTIFICATION_STORAGE_KEY = "notifications";
const MAX_NOTIFICATION_HISTORY = 100;

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

    const userId = request.headers.get(WORKSPACE_PUSHER_USER_HEADER);

    if (!userId) {
      throw new Error("Missing workspace user header");
    }

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

  sendEvent(event: unknown) {
    try {
      const payload = JSON.stringify(event);
      this.sendMessageToAllUsers(payload);
    } catch (error) {
      console.error("Failed to serialize event for sendEvent", error);
    }
  }

  async sendNotification(notification: WorkspaceNotification) {
    const record = this.createNotificationRecord(notification);
    await this.persistNotification(record);

    const payload = {
      type: "notification" as const,
      workspaceSlug: record.workspaceSlug,
      timestamp: record.createdAt,
      notification: record.notification,
    };

    this.sendMessageToAllUsers(JSON.stringify(payload));
  }

  async listNotifications(): Promise<WorkspaceNotificationRecord[]> {
    const records =
      (await this.storage.get<WorkspaceNotificationRecord[]>(
        NOTIFICATION_STORAGE_KEY,
      )) ?? [];
    return records;
  }

  private createNotificationRecord(
    notification: WorkspaceNotification,
  ): WorkspaceNotificationRecord {
    return {
      id: crypto.randomUUID(),
      workspaceSlug: this.workspaceSlug,
      createdAt: Date.now(),
      notification,
    } satisfies WorkspaceNotificationRecord;
  }

  private async persistNotification(record: WorkspaceNotificationRecord) {
    const existing = await this.listNotifications();
    const updated = [record, ...existing].slice(0, MAX_NOTIFICATION_HISTORY);
    await this.storage.put(NOTIFICATION_STORAGE_KEY, updated);
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
