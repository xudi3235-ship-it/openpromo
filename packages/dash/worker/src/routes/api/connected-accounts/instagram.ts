import { ConnectedAccount } from "@openpromo/core/domain/connected-account/connected-account";
import { instagramOAuthService } from "@openpromo/core/domain/connected-account/instagram";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { Platform } from "@openpromo/core/schemas/connected-account.sql";
import { Hono } from "hono";
import * as z from "zod";
import { clearAuthStateCookie, getAuthState } from "../../../helpers/auth";
import { AppError } from "../../../helpers/error";
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
        throw new AppError(400, { message: "Missing code or state" });
      }

      const storedAuthState = getAuthState(ctx);
      if (!storedAuthState || storedAuthState.nonce !== state) {
        // Clear any stored state since verification failed
        clearAuthStateCookie(ctx);
        throw new AppError(400, {
          message: "Invalid state parameter - possible CSRF attack",
        });
      }

      // actor initiated the OAuth flow
      const actor = storedAuthState.actor;
      if (!actor || actor.type !== "workspace_user") {
        clearAuthStateCookie(ctx);
        throw new AppError(400, {
          message: "Invalid actor information in auth state",
        });
      }
      // Clear the stored state since we've verified it
      clearAuthStateCookie(ctx);
      const workspaceSlug = actor.properties.workspaceSlug;
      return Actor.provide("workspace_user", actor.properties, async () => {
        // 1. Authenticate with Instagram
        const authResult = await instagramOAuthService.authenticate({
          code,
          workspaceSlug,
        });

        // 2. Create a connected account for the authenticated Instagram account
        const account = await ConnectedAccount.create({
          platform: Platform.enum.INSTAGRAM,
          externalAccountId: authResult.id,
          accountName: authResult.name,
          externalUrl: `https://www.instagram.com/${authResult.username}`,
          profilePicUrl: authResult.picture ? authResult.picture : null,
          // TODO: implement encryption
          encryptedAccessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
          metadata: {
            accountId: authResult.id,
            username: authResult.username,
            accountName: authResult.name,
          },
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
        message: "Failed to connect to your Instagram account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
  },
);
