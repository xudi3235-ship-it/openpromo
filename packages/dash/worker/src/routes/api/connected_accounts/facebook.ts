import { zValidator } from "@hono/zod-validator";
import { Actor } from "@openpromo/core/actor";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { ConnectedAccount } from "@openpromo/core/connected_account/connected_account";
import { facebookOAuthService } from "@openpromo/core/connected_account/facebook";
import { Platform } from "@openpromo/core/db/schema/connected_account.sql";
import { Hono } from "hono";
import * as z from "zod";
import { clearAuthStateCookie, getAuthState } from "../../../helpers/auth";
import { AppError } from "../../../helpers/error";
import type { PopupRelayQuery } from "../popup-relay/constants";

// Validation schemas
const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
});

export const facebookConnectedAccountRoute = new Hono<ApiEnv>().get(
  "/callback",
  zValidator("query", CallbackQuerySchema),
  async (ctx) => {
    try {
      // This endpoint is hit when user successfully logged in via FB OAuth dialog
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
        // 1. Authenticate with Facebook
        const authResult = await facebookOAuthService.authenticate({
          code,
          workspaceSlug,
        });

        // 2. Fetch list of pages user has granted access to
        const userPages = await facebookOAuthService.getUserPages(
          authResult.accessToken,
        );

        // 3. For each linked page, create a connected account
        const accounts = await Promise.allSettled(
          userPages.map((page) =>
            ConnectedAccount.create({
              platform: Platform.enum.FACEBOOK,
              externalAccountId: page.id,
              accountName: page.name,
              externalUrl: `https://www.facebook.com/${page.id}`,
              profilePicUrl: page.picture?.data?.url ?? null,
              // TODO: implement encryption
              encryptedAccessToken: authResult.accessToken,
              refreshToken: authResult.refreshToken,
              tokenExpiresAt: new Date(
                Date.now() + authResult.expiresIn * 1000,
              ),
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
      });
    } catch (error) {
      console.error(error);
      const qp = new URLSearchParams({
        status: "error",
        event: "accounts_connected",
        message: "Failed to connect to your account.",
      } satisfies PopupRelayQuery).toString();
      return ctx.redirect(`/api/popup-relay?${qp}`);
    }
  },
);
