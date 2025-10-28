import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { withAuth } from "../../../../middleware/with-auth";
import { zValidator } from "../../../../middleware/zod-validator";

const TikTokBizAuthQuerySchema = z.object({
  state: z.string().optional(),
});

const TikTokBizCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const tikTokBusinessConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", zValidator("query", TikTokBizAuthQuerySchema), async (ctx) => {
    const { state } = ctx.req.valid("query");
    Actor.assert("workspace_user");
    const nonce =
      state || crypto.randomUUID().replace(/-/g, "").substring(0, 6);

    // TODO: Generate TikTok Business authorization URL once app credentials are available.

    return ctx.json(
      {
        success: false,
        message: "TikTok Business messaging OAuth not implemented yet.",
        state: nonce,
      },
      501,
    );
  })
  .get(
    "/callback",
    zValidator("query", TikTokBizCallbackQuerySchema),
    async (ctx) => {
      ctx.req.valid("query");
      Actor.assert("workspace_user");

      // TODO: Exchange code for tokens and persist messaging credentials.

      return ctx.json(
        {
          success: false,
          message: "TikTok Business messaging callback not implemented yet.",
        },
        501,
      );
    },
  );
