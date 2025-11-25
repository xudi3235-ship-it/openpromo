/**
 * Internal API Router Definition for OpenAPI Generation
 *
 * This file defines the internal API routes schema without any runtime dependencies
 * (middleware, Cloudflare Worker context, etc.). It's used for:
 * 1. OpenAPI spec generation (Python SDK)
 * 2. Imported by dash/worker internal routes for schema consistency
 *
 * Schema source of truth: Python Pydantic models in backend/src/routes/callbacks.py
 * Generated Zod schemas: @shared/generated/openpromo_backend.zod.ts
 */

import {
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody,
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostResponse,
} from "@openpromo/shared/generated/openpromo_backend.zod";
import { os } from "@orpc/server";
import * as z from "zod";

// ============ Re-export Schemas ============

export {
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody as VideoJobUpdateInputSchema,
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostResponse as VideoJobUpdateOutputSchema,
} from "@openpromo/shared/generated/openpromo_backend.zod";

export const HealthCheckOutputSchema = z.object({
  status: z.string(),
  timestamp: z.number(),
});

// ============ Route Config (shared between spec and runtime) ============

export const VIDEO_JOB_UPDATE_ROUTE = {
  method: "POST",
  path: "/internal/video-job-update",
  summary: "Update video generation job status",
  description:
    "Receives job status updates from Modal and dispatches to workspace WebSocket",
  tags: ["internal"],
} as const;

export const HEALTH_CHECK_ROUTE = {
  method: "GET",
  path: "/internal/health",
  summary: "Health check",
  description: "Simple health check for internal API",
  tags: ["internal"],
} as const;

// ============ Router for OpenAPI Generation ============

/**
 * Internal router with stub handlers for OpenAPI spec generation.
 * The actual implementation is in dash/worker/src/orpc/routes/internal.ts
 */
export const internalRouterSpec = {
  videoJobUpdate: os
    .route(VIDEO_JOB_UPDATE_ROUTE)
    .input(videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody)
    .output(videoGenCallbackSchemaCallbacksVideoGenSchemaPostResponse)
    .handler(async () => ({ success: true, message: "ok" })),

  healthCheck: os
    .route(HEALTH_CHECK_ROUTE)
    .output(HealthCheckOutputSchema)
    .handler(async () => ({ status: "ok", timestamp: Date.now() })),
};
