/**
 * Internal ORPC routes for Modal → Cloudflare Worker communication
 *
 * These routes are designed to be consumed by Python SDK generated from OpenAPI spec.
 * They use .route() and .output() for OpenAPI compliance.
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

// ============ Internal Routes ============

/**
 * POST /internal/video-job-update
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

    // Pass through the event directly - no transformation needed
    // Modal sends the event in the exact format clients expect
    await dispatchWorkspaceEvent(workspaceId, event);

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
