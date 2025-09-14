/** biome-ignore-all lint/suspicious/noExplicitAny: later */
import { Actor } from "@cloudflare/actors";
import type { ApiEnv } from "@core/helpers/api-env";

export class WorkspacePusher extends Actor<ApiEnv> {
  private periodicInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    console.log("WorkspacePusher constructor called", this.identifier);
  }

  protected onRequest(request: Request): Promise<Response> {
    console.log("WorkspacePusher onRequest called", request.url);

    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get("upgrade");
    const connectionHeader = request.headers.get("connection");

    if (
      upgradeHeader?.toLowerCase() === "websocket" &&
      connectionHeader?.toLowerCase().includes("upgrade")
    ) {
      console.log("WebSocket upgrade detected in WorkspacePusher");

      // Extract workspace slug from URL
      const url = new URL(request.url);
      const workspaceSlug = url.searchParams.get("workspaceSlug");

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      server.accept();

      // Set up event listeners
      server.addEventListener("message", (event) => {
        console.log(`Message from workspace ${workspaceSlug}:`, event.data);

        // Echo the message back (you can modify this behavior)
        server.send(`Echo from workspace ${workspaceSlug}: ${event.data}`);

        // Here you can access Durable Object storage:
        // this.storage.put("lastMessage", event.data);
      });

      server.addEventListener("close", () => {
        console.log(`WebSocket disconnected from workspace: ${workspaceSlug}`);
        // Clear interval when connection closes
        if (this.periodicInterval) {
          clearInterval(this.periodicInterval);
          this.periodicInterval = null;
        }
      });

      // Send initial connection message
      console.log(`WebSocket connected to workspace: ${workspaceSlug}`);
      server.send(
        JSON.stringify({
          type: "connection",
          message: `Connected to workspace: ${workspaceSlug}`,
          timestamp: Date.now(),
          doId: this.identifier,
        }),
      );

      // Start periodic events every 10 seconds
      this.startPeriodicEvents(server, workspaceSlug);

      // Return the WebSocket upgrade response
      return Promise.resolve(
        new Response(null, {
          status: 101,
          webSocket: client,
        }),
      );
    }

    // For non-WebSocket requests, return a simple response
    return Promise.resolve(
      Response.json({
        message: "WorkspacePusher Durable Object",
        identifier: this.identifier,
      }),
    );
  }

  private startPeriodicEvents(ws: WebSocket, workspaceSlug: string | null) {
    let eventCount = 0;

    this.periodicInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        eventCount++;
        const event = {
          type: "periodic",
          message: `Periodic event #${eventCount} from workspace ${workspaceSlug}`,
          timestamp: Date.now(),
          eventId: `event-${eventCount}`,
          doId: this.identifier,
        };

        ws.send(JSON.stringify(event));
        console.log(
          `Sent periodic event ${eventCount} to workspace ${workspaceSlug}`,
        );
      } else {
        console.log("WebSocket closed, clearing periodic events");
        if (this.periodicInterval) {
          clearInterval(this.periodicInterval);
          this.periodicInterval = null;
        }
      }
    }, 10000); // 10 seconds

    console.log(`Started periodic events for workspace ${workspaceSlug}`);
  }
}
