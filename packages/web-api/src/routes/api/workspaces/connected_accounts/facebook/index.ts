import { zValidator } from "@hono/zod-validator";
import { Actor } from "@openpromo/core/actor";
import { ConnectedAccount } from "@openpromo/core/connected_account/connected_account";
import { facebookOAuthService } from "@openpromo/core/connected_account/facebook";
import { Platform } from "@openpromo/core/schema/connected_account.sql";
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
import type { PopupRelayQuery } from "../../../popup-relay/constants";

// Validation schemas
const AuthQuerySchema = z.object({
  state: z.string().optional(),
});

const CallbackBodySchema = z.object({
  code: z.string().optional(),
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
    const workspaceSlug = Actor.workspaceSlug();

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
      workspaceSlug,
    );

    return ctx.json({
      success: true,
      data: authData,
    });
  })
  .get("/callback", zValidator("query", CallbackBodySchema), async (ctx) => {
    try {
      // this endpoint is hit when user successfully logged in via
      // FB dialog oauth.
      // 1. token exchange
      const { code, state } = ctx.req.valid("query");
      if (!code || !state) {
        throw new AppError(400, { message: "Missing code or state" });
      }
      const workspaceSlug = Actor.workspaceSlug();
      const storedAuthState = getAuthState(ctx);

      if (!storedAuthState || storedAuthState.nonce !== state) {
        // Clear any stored state since verification failed
        clearAuthStateCookie(ctx);
        throw new AppError(400, {
          message: "Invalid state parameter - possible CSRF attack",
        });
      }

      // Clear the stored state since we've verified it
      clearAuthStateCookie(ctx);

      // 2. Authenticate with Facebook
      const authResult = await facebookOAuthService.authenticate({
        code,
        workspaceSlug,
      });
      // 3. fetch list of pages user has granted access to
      const userPages = await facebookOAuthService.getUserPages(
        authResult.accessToken,
      );

      // 4. for each linked page, 1:1 map to connected account
      // we do this in a flatten way so that user can have N FB + M IG, etc.
      // accounts connected.
      const accounts = await Promise.allSettled(
        userPages.map((page) =>
          ConnectedAccount.create({
            platform: Platform.enum.FACEBOOK,
            externalAccountId: page.id,
            accountName: page.name,
            externalUrl: `https://www.facebook.com/${page.id}`,
            profilePicUrl: page.picture?.data?.url ?? null,
            // TODO: impl encryptions
            encryptedAccessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
            metadata: {
              pageId: page.id,
              pageName: page.name,
              followers: page.fan_count,
            },
          }),
        ),
      );

      const failedCount = accounts.filter(
        (a) => a.status === "rejected",
      ).length;
      if (failedCount > 0) {
        throw new AppError(400, {
          message: `Failed to create ${failedCount} connected accounts.`,
        });
      }

      const successAccounts = accounts
        .map((a) => (a.status === "fulfilled" ? a.value : null))
        .filter((a) => a !== null);

      const qp = new URLSearchParams({
        status: "success",
        event: "accounts_connected",
        message: `Successfully connected to ${successAccounts.map((a) => a.accountName).join(", ")}.`,
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    } catch (error) {
      console.error(error);
      const qp = new URLSearchParams({
        status: "error",
        event: "accounts_connected",
        message: "Failed to connect to your account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
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
