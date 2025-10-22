import { ConnectedAccount } from "@core/domain/connected-account";
import { facebookOAuthService } from "@core/domain/connected-account/facebook";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
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
      return await Actor.provide(
        "workspace_user",
        actor.properties,
        async () => {
          // 1. Authenticate with Facebook
          // this is user access scope
          const authResult = await facebookOAuthService.authenticate({
            code,
            workspaceSlug,
          });

          // 2. Fetch list of pages user has granted access to
          const userPages = await facebookOAuthService.getUserPages(
            authResult.accessToken, // user access token
          );

          // 3. For each linked page, create a connected account
          const accounts = await Promise.allSettled(
            userPages.map(async (page) => {
              console.log({ page: JSON.stringify(page) });
              if (!page.access_token) {
                throw new AppError(500, {
                  message: `No access token for page: ${page.id}`,
                });
              }
              const profilePicUrl = page.picture?.data?.url || "";
              const acc = await ConnectedAccount.create({
                platform: Platform.enum.FACEBOOK,
                externalAccountId: page.id,
                accountName: page.name,
                lastBackfillAt: null,
                externalUrl: `https://www.facebook.com/${page.id}`,
                profilePicUrl,
                // NOTE: this is page-level access token!!
                // TODO: implement encryption
                encryptedAccessToken: page.access_token,
                refreshToken: page.access_token,
                tokenExpiresAt: new Date(
                  Date.now() + authResult.expiresIn * 1000,
                ),
                metadata: {
                  pageID: page.id,
                  pageName: page.name,
                  permissions: authResult.permissions,
                  followers: page.fan_count,
                  profilePicUrl,
                  user: {
                    accessToken: authResult.accessToken,
                    refreshToken: authResult.refreshToken,
                  },
                },
                followersCount:
                  typeof page.fan_count === "number" ? page.fan_count : 0,
                metricsRefreshedAt:
                  typeof page.fan_count === "number" ? new Date() : null,
              });
              await facebookOAuthService.setupWebhook(page.access_token);
              return acc;
            }),
          );

          const failed = accounts
            .filter((a) => a.status === "rejected")
            .map((a) => a.reason);
          if (failed.length > 0) {
            throw new AppError(400, {
              message: `Failed to create ${failed.length} connected accounts. Reasons:\n${failed.join("\n")}`,
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
        },
      );
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
