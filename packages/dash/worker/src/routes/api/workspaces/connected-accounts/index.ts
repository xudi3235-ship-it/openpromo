import {
  facebookOAuthService,
  instagramOAuthService,
} from "@core/domain/connected-account";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { withAuth } from "../../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";
import { facebookConnectedAccountRoute } from "./facebook";
import { instagramConnectedAccountRoute } from "./instagram";
import { tikTokConnectedAccountRoute } from "./tiktok";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  // List connected accounts - all workspace members can view
  .get("/", withWorkspaceRole(WORKSPACE_ROLE.VIEWER), async (c) => {
    const accounts = await ConnectedAccount.list();
    return c.json({ accounts });
  })
  // OAuth routes require admin access
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))
  .route("/facebook", facebookConnectedAccountRoute)
  .route("/instagram", instagramConnectedAccountRoute)
  .route("/tiktok", tikTokConnectedAccountRoute)
  // Delete account requires admin access
  .delete(
    "/:accountId",
    zValidator(
      "param",
      z.object({
        accountId: z.string(),
      }),
    ),
    async (ctx) => {
      const { accountId } = ctx.req.valid("param");
      const account = await ConnectedAccount.fromID(accountId);
      switch (account.platform) {
        case "FACEBOOK":
          await facebookOAuthService.teardownWebhook(
            account.encryptedAccessToken,
          );
          break;
        case "INSTAGRAM":
          await instagramOAuthService.teardownWebhook(
            account.encryptedAccessToken,
          );
          break;
        case "TIKTOK":
          // TODO: implement
          break;
      }
      await ConnectedAccount.deleteById(accountId);
      return ctx.json({
        success: true,
      });
    },
  );
