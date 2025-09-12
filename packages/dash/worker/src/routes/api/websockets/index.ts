import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
export const websocketsRoute = new Hono<ApiEnv>().get(
  "/demo",
  upgradeWebSocket((c) => {
    c;
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
    };
  }),
);
