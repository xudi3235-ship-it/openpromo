import { create } from "@bufbuild/protobuf";
import type { ConnectRouter } from "@connectrpc/connect";
import type { ApiEnv } from "@core/helpers/api-env";
import { connectWorkersAdapter } from "@depot/connectrpc-workers";
import {
  InternalService,
  VideoJobUpdateResponseSchema,
} from "@openpromo/core/gen/internal/v1/internal_pb";
import { Hono } from "hono";
import { withAuth } from "../../middleware/with-auth";

/**
 * Connect RPC routes for internal service communication
 * Used by Modal Python backend to call the CF Worker
 */
function routes(router: ConnectRouter) {
  router.service(InternalService, {
    async videoJobUpdate(request) {
      console.log("[1.] VideoJobUpdate RPC called", {
        workspaceId: request.workspaceId,
        jobId: request.event?.jobId,
        state: request.event?.state,
        progress: request.event?.progress,
        message: request.event?.message,
      });

      // TODO: Implement actual logic to broadcast via WebSocket
      // This will be connected to the Durable Object that manages WebSocket connections

      return create(VideoJobUpdateResponseSchema, {
        success: true,
      });
    },
  });
}

// Create the Connect RPC handler with explicit typing for Cloudflare Workers
const connectHandler = connectWorkersAdapter<ApiEnv["Bindings"]>({
  routes,
  // Serve under /api/connect prefix
  requestPathPrefix: "/api/connect",
});

/**
 * Hono route that delegates to Connect RPC handler
 * Mount this at /api/connect in the main api routes
 *
 * Requires admin API token authentication via withAuth middleware
 */
export const connectRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .all("/*", async (c) => {
    // Use the native fetch handler - cast to bypass strict type checking
    // The connectWorkersAdapter expects standard CF Worker request types
    const response = await connectHandler(
      c.req.raw as Parameters<typeof connectHandler>[0],
      c.env,
      c.executionCtx,
    );
    return response;
  });
