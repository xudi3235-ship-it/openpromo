import { zValidator } from "@hono/zod-validator";
import { facebookOAuthService } from "@openpromo/core/connected_account/facebook";
import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../../../helpers/error";
import { withAuth } from "../../../../middleware/with-auth";
import type { ApiEnv } from "../../../../types";

// Validation schemas
const AuthQuerySchema = z.object({
  state: z.string().optional(),
});

const CallbackBodySchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  codeVerifier: z.string().min(1, "Code verifier is required"),
});

const ReconnectBodySchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

export const facebookConnectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/auth", zValidator("query", AuthQuerySchema), async (ctx) => {
    const { state } = ctx.req.valid("query");

    // Generate state and codeVerifier for the caller
    const authState =
      state || crypto.randomUUID().replace(/-/g, "").substring(0, 6);
    const codeVerifier = crypto.randomUUID().replace(/-/g, "").substring(0, 10);

    const authData = await facebookOAuthService.getLoginUrl(
      authState,
      codeVerifier,
    );

    return ctx.json({
      success: true,
      data: authData,
    });
  })
  .post("/callback", zValidator("json", CallbackBodySchema), async (ctx) => {
    const { code, codeVerifier } = ctx.req.valid("json");

    // Authenticate with Facebook
    const authResult = await facebookOAuthService.authenticate({
      code,
      codeVerifier,
    });

    return ctx.json({
      success: true,
      data: authResult,
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
  })
  .onError((err, _) => {
    console.error("Facebook API error:", err);
    throw new AppError(500, {
      message: `${err.message}`,
      userMessage: "Something went wrong. Please try again later.",
    });
  });
