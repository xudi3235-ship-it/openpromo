import type { ApiEnv } from "@core/helpers/api-env";
import {
  authenticateWithCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "@core/helpers/auth";
import { Pusher } from "@core/helpers/pusher";
import * as cookie from "cookie";

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

class UserWebSocketManager {
  private userIdToWebSocketsMap: Map<string, Set<WebSocket>> = new Map();

  addWebSocket(userId: string, ws: WebSocket): void {
    const webSockets = this.userIdToWebSocketsMap.get(userId) || new Set();
    console.log(`Adding WebSocket for user ${userId}:`, ws);
    webSockets.add(ws);
    this.userIdToWebSocketsMap.set(userId, webSockets);
    console.log(`Now have ${webSockets.size} sessions for user ${userId}`);
    console.log(
      `Total users: ${this.getTotalUsers()}, Total sessions: ${this.getTotalSessions()}`,
    );
  }

  removeWebSocket(userId: string, ws: WebSocket): void {
    const webSockets = this.userIdToWebSocketsMap.get(userId);
    if (webSockets) {
      webSockets.delete(ws);
      if (webSockets.size === 0) {
        this.userIdToWebSocketsMap.delete(userId);
      }
    }
  }

  getWebSocketsByUserId(userId: string): Set<WebSocket> {
    return this.userIdToWebSocketsMap.get(userId) || new Set();
  }

  getAllWebSockets(): Set<WebSocket> {
    const allWebSockets = new Set<WebSocket>();

    for (const webSockets of this.userIdToWebSocketsMap.values()) {
      webSockets.forEach((ws) => {
        allWebSockets.add(ws);
      });
    }

    return allWebSockets;
  }

  getUserIdFromWebSocket(ws: WebSocket): string | undefined {
    for (const [userId, webSockets] of this.userIdToWebSocketsMap.entries()) {
      if (webSockets.has(ws)) {
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
    for (const webSockets of this.userIdToWebSocketsMap.values()) {
      total += webSockets.size;
    }
    return total;
  }
}
