import {
  ConnectedAccount,
  tikTokBusinessOAuthService,
} from "@core/domain/connected-account";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
import { Hono } from "hono";
import * as z from "zod";
import {
  clearAuthStateCookie,
  getAuthState,
  setAuthStateCookie,
} from "../../../../helpers/auth";
import { AppError } from "../../../../helpers/error";
import { withAuth } from "../../../../middleware/with-auth";
import { zValidator } from "../../../../middleware/zod-validator";
import type { PopupRelayQuery } from "../../popup-relay/constants";

const TikTokBizAuthQuerySchema = z.object({
  state: z.string().optional(),
});

const TikTokBizCallbackQuerySchema = z.object({
  auth_code: z.string(),
  state: z.string(),
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
  })
  .get(
    "/callback",
    zValidator("query", TikTokBizCallbackQuerySchema),
    async (ctx) => {
      try {
        const { auth_code, state } = ctx.req.valid("query");

        const storedAuthState = getAuthState(ctx);
        if (!storedAuthState || storedAuthState.nonce !== state) {
          clearAuthStateCookie(ctx);
          throw new AppError(400, {
            message: "Invalid state parameter - possible CSRF attack",
          });
        }

        const actor = storedAuthState.actor;
        if (!actor || actor.type !== "workspace_user") {
          clearAuthStateCookie(ctx);
          throw new AppError(400, {
            message: "Invalid actor information in auth state",
          });
        }

        clearAuthStateCookie(ctx);
        const workspaceSlug = actor.properties.workspaceSlug;

        return Actor.provide("workspace_user", actor.properties, async () => {
          const authResult = await tikTokBusinessOAuthService.authenticate({
            code: auth_code,
            workspaceSlug,
          });

          const profilePicUrl = authResult.picture || "";
          const externalUrl = "https://business.tiktok.com";

          const now = new Date();
          const account = await ConnectedAccount.create({
            platform: Platform.enum.TIKTOK,
            tiktokAuthType: "BUSINESS_LOGIN",
            externalAccountId: authResult.id,
            accountName: authResult.name,
            externalUrl,
            profilePicUrl,
            encryptedAccessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            lastBackfillAt: null,
            tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
            metadata: {
              type: "BUSINESS_LOGIN",
              businessAccountId: authResult.id,
              businessName: authResult.name,
              profilePicUrl,
              permissions: authResult.permissions,
              businessType: authResult.businessType,
              industryCategory: authResult.industryCategory,
            },
            followersCount: 0,
            followingCount: 0,
            metricsRefreshedAt: now,
          });

          const qp = new URLSearchParams({
            status: "success",
            event: "accounts_connected",
            message: `Successfully connected to ${account.accountName}.`,
          } satisfies PopupRelayQuery).toString();
          return ctx.redirect(`/api/popup-relay?${qp}`);
        });
      } catch (error) {
        console.error(error);
        const qp = new URLSearchParams({
          status: "error",
          event: "accounts_connected",
          message: "Failed to connect to your TikTok Business account.",
        } satisfies PopupRelayQuery).toString();
        return ctx.redirect(`/api/popup-relay?${qp}`);
      }
    },
  );
