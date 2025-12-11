/**
 * DEPRECATED: This route is deprecated since 2025-12-10.
 *
 * All TikTok OAuth now uses the Business API flow.
 * This route is kept for historical context and should return an error if accessed.
 *
 * Migration: All TikTok connections should use /api/workspaces/connected-accounts/tiktok-business/auth
 */
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../../../middleware/with-auth";

export const tikTokConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", async (ctx) => {
    return ctx.json(
      {
        success: false,
        error: {
          code: "DEPRECATED_ENDPOINT",
          message:
            "TikTok OAuth flow has been deprecated. Please use TikTok Business OAuth instead.",
          migrationPath:
            "Use /api/workspaces/connected-accounts/tiktok-business/auth",
        },
      },
      410,
    ); // 410 Gone
  });
