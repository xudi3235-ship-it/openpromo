import { facebookOAuthService } from "@openpromo/core/domain/connected-account/facebook";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { setAuthStateCookie } from "../../../../../helpers/auth";
import { withAuth } from "../../../../../middleware/with-auth";
import { zValidator } from "../../../../../middleware/zod-validator";

const AuthQuerySchema = z.object({
  state: z.string().optional(),
});

const ReconnectBodySchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

export const facebookConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", zValidator("query", AuthQuerySchema), async (ctx) => {
    const { state } = ctx.req.valid("query");
    const authState =
      state || crypto.randomUUID().replace(/-/g, "").substring(0, 6);
    const codeVerifier = crypto.randomUUID().replace(/-/g, "").substring(0, 10);

    // Store the state securely in a cookie for verification later
    setAuthStateCookie(ctx, {
      nonce: authState,
      returnTo: undefined, // You can add returnTo logic if needed
      actor: Actor.assert("workspace_user"),
    });
    const authData = await facebookOAuthService.getLoginUrl(
      authState,
      codeVerifier,
    );
    return ctx.json({
      success: true,
      data: authData,
    });
  })
  .post("/reconnect", zValidator("json", ReconnectBodySchema), async (ctx) => {
    const { pageId, accessToken } = ctx.req.valid("json");

    const reconnectResult = await facebookOAuthService.reConnect(
      pageId,
      accessToken,
    );

    return ctx.json({
      success: true,
      data: reconnectResult,
    });
  });
