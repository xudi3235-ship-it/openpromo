import {
  ConnectedAccount,
  tikTokOAuthService,
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
  code: z.string().optional(),
  state: z.string().optional(),
});

export const tikTokConnectedAccountRoute = new Hono<ApiEnv>().get(
  "/callback",
  zValidator("query", CallbackQuerySchema),
  async (ctx) => {
    try {
      const { code, state } = ctx.req.valid("query");
      if (!code || !state) {
        throw createVisibleError(400, { message: "Missing code or state" });
      }

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

      const codeVerifier = storedAuthState.codeVerifier;
      return Actor.provide("workspace_user", actor.properties, async () => {
        const authResult = await tikTokOAuthService.authenticate({
          code,
          workspaceSlug,
          codeVerifier,
        });

        const profilePicUrl = authResult.picture ? authResult.picture : "";
        const username = authResult.username || authResult.id;
        const externalUrl = authResult.username
          ? `https://www.tiktok.com/@${authResult.username}`
          : "https://www.tiktok.com";

        const now = new Date();
        const account = await ConnectedAccount.create({
          platform: Platform.enum.TIKTOK,
          tiktokAuthType: "DEVELOPER_OAUTH",
          externalAccountId: authResult.id,
          accountName: authResult.name,
          externalUrl,
          profilePicUrl,
          encryptedAccessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          lastBackfillAt: null,
          tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
          metadata: {
            type: "DEVELOPER_OAUTH",
            tiktokUserId: authResult.id,
            username,
            displayName: authResult.name,
            profilePicUrl,
            permissions: authResult.permissions,
            unionId: authResult.unionId,
          },
          followersCount: authResult.followersCount ?? 0,
          followingCount: authResult.followingCount ?? 0,
          metricsRefreshedAt:
            authResult.followersCount !== undefined ||
            authResult.followingCount !== undefined
              ? now
              : null,
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
        message: "Failed to connect to your TikTok account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
  },
);
