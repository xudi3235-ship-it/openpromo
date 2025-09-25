import { tikTokOAuthService } from "@core/domain/connected-account/tiktok";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { setAuthStateCookie } from "../../../../../helpers/auth";
import { withAuth } from "../../../../../middleware/with-auth";
import { zValidator } from "../../../../../middleware/zod-validator";

const AuthQuerySchema = z.object({
  state: z.string().optional(),
});

export const tikTokConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", zValidator("query", AuthQuerySchema), async (ctx) => {
    const { state } = ctx.req.valid("query");
    const authState =
      state || crypto.randomUUID().replace(/-/g, "").substring(0, 6);
    const codeVerifier = crypto.randomUUID().replace(/-/g, "").substring(0, 10);

    setAuthStateCookie(ctx, {
      nonce: authState,
      returnTo: undefined,
      actor: Actor.assert("workspace_user"),
    });

    const authData = await tikTokOAuthService.getLoginUrl(
      authState,
      codeVerifier,
    );

    return ctx.json({
      success: true,
      data: authData,
    });
  });
