import { tikTokBusinessOAuthService } from "@core/domain/connected-account";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { setAuthStateCookie } from "../../../../helpers/auth";
import { withAuth } from "../../../../middleware/with-auth";
import { zValidator } from "../../../../middleware/zod-validator";

const TikTokBizAuthQuerySchema = z.object({
  state: z.string().optional(),
});

export const tikTokBusinessConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", zValidator("query", TikTokBizAuthQuerySchema), async (ctx) => {
    const { state } = ctx.req.valid("query");
    const authState =
      state || crypto.randomUUID().replace(/-/g, "").substring(0, 6);

    setAuthStateCookie(ctx, {
      nonce: authState,
      returnTo: undefined,
      actor: Actor.assert("workspace_user"),
    });

    const authData = await tikTokBusinessOAuthService.getLoginUrl(authState);

    return ctx.json({
      success: true,
      data: authData,
    });
  });
