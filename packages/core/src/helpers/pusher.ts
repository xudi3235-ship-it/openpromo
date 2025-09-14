import { DurableObject } from "cloudflare:workers";
import type { ApiEnv } from "./api-env";

export abstract class Pusher extends DurableObject<ApiEnv> {
  protected get storage() {
    return this.ctx.storage;
  }

  override fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("upgrade");
    const connectionHeader = request.headers.get("connection");

    // Check if this is a WebSocket upgrade request
    if (
      upgradeHeader?.toLowerCase() === "websocket" &&
      connectionHeader?.toLowerCase().includes("upgrade")
    ) {
      console.log("Pusher fetch - WebSocket upgrade request");

      // Get the WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      server.accept();

      this.onWebSocketConnect(server, request).catch((error) => {
        console.error("Error in onWebSocketConnect:", error);
      });

      server.addEventListener("close", (_event) => {
        this.onWebSocketDisconnect(server).catch((error) => {
          console.error("Error in onWebSocketDisconnect:", error);
        });
      });

      server.addEventListener("message", (event) => {
        this.onWebSocketMessage(server, event.data).catch((error) => {
          console.error("Error in onWebSocketMessage:", error);
        });
      });

      server.addEventListener("error", (event) => {
        console.error("WebSocket error:", event);
        try {
          this.onWebSocketDisconnect(server);
        } catch (error) {
          console.error("Error handling WebSocket error:", error);
        }
      });

      // Return the client WebSocket
      return Promise.resolve(
        new Response(null, {
          status: 101,
          webSocket: client,
        }),
      );
    }

    // Handle regular HTTP requests
    return this.onRequest(request);
  }

  protected abstract onRequest(request: Request): Promise<Response>;

  protected abstract onWebSocketConnect(
    ws: WebSocket,
    request: Request,
  ): Promise<void>;

  protected abstract onWebSocketDisconnect(ws: WebSocket): Promise<void>;

  protected abstract onWebSocketMessage(
    ws: WebSocket,
    message: unknown,
  ): Promise<void>;
}
