import { zValidator } from "@hono/zod-validator";
import { facebookOAuthService } from "@openpromo/core/connected_account/facebook";
import { NotImplementedError } from "@openpromo/core/error";
import { Hono } from "hono";
import { z } from "zod";
import {
  clearAuthStateCookie,
  getAuthState,
  setAuthStateCookie,
} from "../../../../../helpers/auth";
import { AppError } from "../../../../../helpers/error";
import { withAuth } from "../../../../../middleware/with-auth";
import type { ApiEnv } from "../../../../../types";

// Validation schemas
const AuthQuerySchema = z.object({
  state: z.string().optional(),
});

const CallbackBodySchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string(),
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

    // Store the state securely in a cookie for verification later
    setAuthStateCookie(ctx, {
      nonce: authState,
      returnTo: undefined, // You can add returnTo logic if needed
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
  .get("/callback", zValidator("query", CallbackBodySchema), async (ctx) => {
    // this endpoint is hit when user successfully logged in via
    // FB dialog oauth.
    // 1. token exchange
    const { code, state } = ctx.req.valid("query");
    const storedAuthState = getAuthState(ctx);

    if (!storedAuthState || storedAuthState.nonce !== state) {
      // Clear any stored state since verification failed
      clearAuthStateCookie(ctx);
      throw new AppError(400, {
        message: "Invalid state parameter - possible CSRF attack",
        userMessage: "Authentication failed. Please try again.",
      });
    }

    // Clear the stored state since we've verified it
    clearAuthStateCookie(ctx);

    // 2. Authenticate with Facebook
    const authResult = await facebookOAuthService.authenticate({
      code,
    });
    // 3. fetch list of pages user has granted access to
    const userPages = await facebookOAuthService.getUserPages(
      authResult.accessToken,
    );

    // 4. for each linked page, 1:1 map to connected account
    // we do this in a flatten way so that user can have N FB + M IG, etc.
    // accounts connected.
    for (const page of userPages) {
      console.debug({ page });
      throw new NotImplementedError("TODO");
    }

    // at this point, we should be storing the connected account in our db.
    // open Q: seems like user can select multiple pages/businesses to connect
    // how do we wanna handle the data models here..?
    // this is the user Actor.
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
