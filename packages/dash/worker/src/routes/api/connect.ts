import { create } from "@bufbuild/protobuf";
import type { ConnectRouter } from "@connectrpc/connect";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import type { ApiEnv } from "@core/helpers/api-env";
import { connectWorkersAdapter } from "@depot/connectrpc-workers";
import {
  InternalService,
  VideoJobUpdateResponseSchema,
} from "@shared/gen/internal/v1/internal_pb";
import {
  createWorkspaceEvent,
  mapVideoJobState,
  WorkspaceEventType,
} from "@shared/workspace";
import { Hono } from "hono";
import { withAuth } from "../../middleware/with-auth";

/**
 * Connect RPC routes for internal service communication
 * Used by Modal Python backend to call the CF Worker。
 * Sevice implementation. protos are located in
 * ./packages/backend/proto/internal/v1/internal.proto
 */
function routes(router: ConnectRouter) {
  router.service(InternalService, {
    async videoJobUpdate(request) {
      const { workspaceId, event } = request;

      if (!event) {
        console.warn("[connect] VideoJobUpdate: missing event");
        return create(VideoJobUpdateResponseSchema, { success: false });
      }

      console.log("[1.] VideoJobUpdate RPC called", {
        workspaceId,
        jobId: event.jobId,
        state: event.state,
        progress: event.progress,
        message: event.message,
      });

      // Transform proto event to WebSocket event format
      const wsEvent = createWorkspaceEvent(
        WorkspaceEventType.VideoGenerationUpdated,
        {
          jobId: event.jobId,
          state: mapVideoJobState(event.state),
          progress: event.progress,
          message: event.message,
          outputUrl: event.outputUrl,
        },
      );

      // Dispatch to workspace WebSocket via Durable Object
      await dispatchWorkspaceEvent(workspaceId, wsEvent);

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
