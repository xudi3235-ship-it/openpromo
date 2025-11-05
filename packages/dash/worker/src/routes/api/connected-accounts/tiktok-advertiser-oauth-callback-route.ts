import {
  ConnectedAccount,
  tikTokAdvertiserOAuthService,
} from "@core/domain/connected-account";
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
  auth_code: z.string(),
  state: z.string(),
});

export const tikTokAdvertiserConnectedAccountRoute = new Hono<ApiEnv>().get(
  "/callback",
  zValidator("query", CallbackQuerySchema),
  async (ctx) => {
    try {
      const { auth_code, state } = ctx.req.valid("query");

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
        const authResult = await tikTokAdvertiserOAuthService.authenticate({
          code: auth_code,
          workspaceSlug,
        });

        const profilePicUrl = authResult.profilePicUrl || "";
        const externalUrl = "https://ads.tiktok.com";

        const now = new Date();
        const account = await ConnectedAccount.create({
          platform: Platform.enum.TIKTOK,
          tiktokAuthType: "ADVERTISER",
          externalAccountId: authResult.advertiserId,
          accountName: authResult.advertiserName,
          externalUrl,
          profilePicUrl,
          encryptedAccessToken: authResult.accessToken,
          refreshToken: null, // Marketing API tokens don't have refresh tokens
          lastBackfillAt: null,
          tokenExpiresAt: null, // Marketing API tokens don't expire in the traditional sense
          metadata: {
            type: "ADVERTISER",
            advertiserId: authResult.advertiserId,
            advertiserName: authResult.advertiserName,
            profilePicUrl,
            permissions: authResult.permissions,
          },
          followersCount: 0,
          followingCount: 0,
          metricsRefreshedAt: now,
        });

        const qp = new URLSearchParams({
          status: "success",
          event: "accounts_connected",
          message: `Successfully connected to TikTok Advertiser ${account.accountName}.`,
        } satisfies PopupRelayQuery).toString();
        return ctx.redirect(`/api/popup-relay?${qp}`);
      });
    } catch (error) {
      console.error(error);
      const qp = new URLSearchParams({
        status: "error",
        event: "accounts_connected",
        message: "Failed to connect to your TikTok Advertiser account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
  },
);
