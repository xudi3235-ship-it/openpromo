import {
  ConnectedAccount,
  instagramOAuthService,
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

// Validation schemas
const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
});

export const instagramConnectedAccountRoute = new Hono<ApiEnv>().get(
  "/callback",
  zValidator("query", CallbackQuerySchema),
  async (ctx) => {
    try {
      // This endpoint is hit when user successfully logged in via Instagram OAuth dialog
      const { code, state } = ctx.req.valid("query");
      if (!code || !state) {
        throw createVisibleError(400, {
          message: "Missing code or state",
          userMessage:
            "Instagram did not return the required authorization data.",
        });
      }

      const storedAuthState = getAuthState(ctx);
      if (!storedAuthState || storedAuthState.nonce !== state) {
        // Clear any stored state since verification failed
        clearAuthStateCookie(ctx);
        throw createVisibleError(400, {
          message: "Invalid state parameter - possible CSRF attack",
          userMessage: "The login session expired. Please try again.",
        });
      }

      // actor initiated the OAuth flow
      const actor = storedAuthState.actor;
      if (!actor || actor.type !== "workspace_user") {
        clearAuthStateCookie(ctx);
        throw createVisibleError(400, {
          message: "Invalid actor information in auth state",
        });
      }
      // Clear the stored state since we've verified it
      clearAuthStateCookie(ctx);
      const workspaceSlug = actor.properties.workspaceSlug;
      return await Actor.provide(
        "workspace_user",
        actor.properties,
        async () => {
          // 1. Authenticate with Instagram
          const authResult = await instagramOAuthService.authenticate({
            code,
            workspaceSlug,
          });
          const profilePicUrl = authResult.picture ? authResult.picture : "";
          // 2. Create a connected account for the authenticated Instagram account
          const now = new Date();
          const account = await ConnectedAccount.create({
            platform: Platform.enum.INSTAGRAM,
            externalAccountId: authResult.userId, // Instagram user ID, NOT app-scoped ID
            accountName: authResult.name,
            externalUrl: `https://www.instagram.com/${authResult.username}`,
            profilePicUrl,
            // TODO: implement encryption
            encryptedAccessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            lastBackfillAt: null,
            tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
            metadata: {
              igAccountID: authResult.userId,
              username: authResult.username,
              profilePicUrl,
              permissions: authResult.permissions,
              appScopedUserID: authResult.id, // app-scoped ID
            },
            followersCount: authResult.followersCount ?? 0,
            followingCount: authResult.followingCount ?? 0,
            metricsRefreshedAt:
              authResult.followersCount !== undefined ||
              authResult.followingCount !== undefined
                ? now
                : null,
          });
          await instagramOAuthService.setupWebhook(authResult.accessToken);

          const qp = new URLSearchParams({
            status: "success",
            event: "accounts_connected",
            message: `Successfully connected to ${account.accountName}.`,
          } satisfies PopupRelayQuery).toString();
          return ctx.redirect(`/api/popup-relay?${qp}`);
        },
      );
    } catch (error) {
      console.error(error);
      const qp = new URLSearchParams({
        status: "error",
        event: "accounts_connected",
        message: "Failed to connect to your Instagram account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
  },
);
