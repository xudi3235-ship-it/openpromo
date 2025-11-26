/**
 * Internal ORPC routes for Modal → Cloudflare Worker communication
 *
 * @deprecated LEGACY - Use Connect RPC InternalService at /api/connect instead.
 *
 * This route is kept for backward compatibility with existing Modal clients.
 * New internal services should use Connect RPC:
 *   - Proto definitions: packages/backend/proto/internal/v1/internal.proto
 *   - Connect handler: packages/dash/worker/src/routes/api/connect.ts
 *   - Python client: packages/backend/src/rpc/internal_client.py
 *
 * Schema source of truth: Python Pydantic models in backend/src/routes/callbacks.py
 * Route definitions: @core/generated/internal-api.ts
 */
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import {
  HEALTH_CHECK_ROUTE,
  HealthCheckOutputSchema,
  VIDEO_JOB_UPDATE_ROUTE,
  VideoJobUpdateInputSchema,
  VideoJobUpdateOutputSchema,
} from "@core/generated/internal-api";
import { ORPCError } from "@orpc/server";
import {
  createWorkspaceEvent,
  type VideoGenerationState,
  WorkspaceEventType,
} from "@shared/workspace";
import { orpcBuilder } from "../context";

// ============ Auth Middleware ============

/**
 * Middleware to validate internal API requests from Modal
 * Uses the admin API token for authentication (same as other internal endpoints)
 */
const withInternalAuth = orpcBuilder.middleware(async ({ context, next }) => {
  const { honoContext: c } = context;
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Missing or invalid Authorization header",
    });
  }

  const token = authHeader.slice(7);
  const expectedToken = c.env.ADMIN_API_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Invalid internal API token",
    });
  }

  return next({ context });
});

/**
 * Map legacy snake_case state to new VideoGenerationState
 * (Legacy includes "queued" which we map to "processing")
 */
function mapLegacyState(
  state: "processing" | "completed" | "failed" | "queued",
): VideoGenerationState {
  if (state === "queued") return "processing";
  return state;
}

// ============ Internal Routes ============

/**
 * POST /internal/video-job-update
 *
 * @deprecated Use Connect RPC InternalService.VideoJobUpdate instead.
 *
 * Receives video generation job updates from Modal backend
 * and dispatches them to the workspace WebSocket.
 *
 * Input schema is generated from Python Pydantic models via orval codegen.
 * This ensures type consistency between Python and TypeScript.
 */
export const videoJobUpdate = orpcBuilder
  .route(VIDEO_JOB_UPDATE_ROUTE)
  .input(VideoJobUpdateInputSchema)
  .output(VideoJobUpdateOutputSchema)
  .use(withInternalAuth)
  .handler(async ({ input }) => {
    const { workspace_id: workspaceId, event } = input;

    // Transform legacy snake_case event to new camelCase format
    const wsEvent = createWorkspaceEvent(
      WorkspaceEventType.VideoGenerationUpdated,
      {
        jobId: event.job_id,
        state: mapLegacyState(event.state),
        progress: event.progress ?? undefined,
        message: event.message ?? undefined,
        outputUrl: event.output_url ?? undefined,
      },
    );

    await dispatchWorkspaceEvent(workspaceId, wsEvent);

    return {
      success: true,
      message: `Event dispatched to workspace ${workspaceId}`,
    };
  });

/**
 * Health check endpoint for internal API
 */
export const internalHealthCheck = orpcBuilder
  .route(HEALTH_CHECK_ROUTE)
  .output(HealthCheckOutputSchema)
  .handler(async () => {
    return {
      status: "ok",
      timestamp: Date.now(),
    };
  });

export const internalRouter = {
  videoJobUpdate,
  healthCheck: internalHealthCheck,
};
