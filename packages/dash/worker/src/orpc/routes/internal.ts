/**
 * Internal ORPC routes for Modal → Cloudflare Worker communication
 *
 * These routes are designed to be consumed by Python SDK generated from OpenAPI spec.
 * They use .route() and .output() for OpenAPI compliance.
 *
 * Schema source of truth: Python Pydantic models in backend/src/routes/callbacks.py
 * Generated Zod schemas: @shared/generated/openpromo_backend.zod.ts
 */
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { ORPCError } from "@orpc/server";
import {
  // Reuse the generated Zod schema from orval - source of truth is Python Pydantic
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody,
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostResponse,
} from "@shared/generated/openpromo_backend.zod";
import * as z from "zod";
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
  .route({
    method: "POST",
    path: "/internal/video-job-update",
    summary: "Update video generation job status",
    description:
      "Receives job status updates from Modal and dispatches to workspace WebSocket",
    tags: ["internal"],
  })
  .input(videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody)
  .output(videoGenCallbackSchemaCallbacksVideoGenSchemaPostResponse)
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
  .route({
    method: "GET",
    path: "/internal/health",
    summary: "Health check",
    description: "Simple health check for internal API",
    tags: ["internal"],
  })
  .output(
    z.object({
      status: z.string(),
      timestamp: z.number(),
    }),
  )
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
