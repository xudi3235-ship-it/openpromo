import {
  ConnectedAccount,
  tikTokBusinessOAuthService,
} from "@core/domain/connected-account";
import { TikTokBusinessAPIClient } from "@core/domain/content/entity/tiktok/business-api-client";
import { ensureTikTokBusinessUrlPrefixVerified } from "@core/domain/content/entity/tiktok/business-property-manager";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
import { Hono } from "hono";
import * as z from "zod";
import { clearAuthStateCookie, getAuthState } from "../../../helpers/auth";
import { createVisibleError } from "../../../helpers/error";
import { zValidator } from "../../../middleware/zod-validator";
import type { PopupRelayQuery } from "../popup-relay/constants";

const CallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
  scopes: z.string().optional(),
});

// callback route for tiktok for business account holder login
// NOTE that this is different from advertiser redirect url.
export const tikTokBusinessConnectedAccountRoute = new Hono<ApiEnv>().get(
  "/callback",
  zValidator("query", CallbackQuerySchema),
  async (ctx) => {
    try {
      const { code, state } = ctx.req.valid("query");

      const storedAuthState = getAuthState(ctx);
      if (!storedAuthState || storedAuthState.nonce !== state) {
        clearAuthStateCookie(ctx);
        throw createVisibleError(400, {
          message: "Invalid state parameter - possible CSRF attack",
        });
      }

      const actor = storedAuthState.actor;
      if (!actor || actor.type !== "workspace_user") {
        clearAuthStateCookie(ctx);
        throw createVisibleError(400, {
          message: "Invalid actor information in auth state",
        });
      }

      clearAuthStateCookie(ctx);
      const workspaceSlug = actor.properties.workspaceSlug;

      return Actor.provide("workspace_user", actor.properties, async () => {
        const authResult = await tikTokBusinessOAuthService.authenticate({
          code,
          workspaceSlug,
        });

        const profilePicUrl = authResult.picture || "";
        const externalUrl = authResult.username
          ? `https://www.tiktok.com/@${authResult.username}`
          : "https://www.tiktok.com";

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
          },
          followersCount: authResult.followerCount ?? 0,
          followingCount: authResult.followingCount ?? 0,
          metricsRefreshedAt:
            authResult.followerCount !== undefined ||
            authResult.followingCount !== undefined
              ? now
              : null,
        });

        try {
          const client = TikTokBusinessAPIClient.fromIdentityContext({
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            businessId: authResult.id,
            connectedAccountId: account.id,
          });
          await ensureTikTokBusinessUrlPrefixVerified(client);
          await tikTokBusinessOAuthService.setupWebhook();
        } catch (error) {
          console.error("Failed to finalize TikTok Business connection", error);
          await ConnectedAccount.deleteById(account.id).catch((deleteError) => {
            console.error(
              "Failed to rollback TikTok Business account after setup failure",
              deleteError,
            );
          });
          throw createVisibleError(500, {
            message:
              "Connected to TikTok, but failed to finalize setup. Please try again shortly.",
          });
        }

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
