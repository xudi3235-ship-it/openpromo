import type { ApiEnv } from "@openpromo/core/actors/index";
import { ConnectedAccount } from "@openpromo/core/domain/connected-account/connected-account";
import { WORKSPACE_ROLE } from "@openpromo/core/domain/workspace/auth";
import { Hono } from "hono";
import * as z from "zod";
import { withAuth } from "../../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";
import { facebookConnectedAccountRoute } from "./facebook";
import { instagramConnectedAccountRoute } from "./instagram";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))
  .route("/facebook", facebookConnectedAccountRoute)
  .route("/instagram", instagramConnectedAccountRoute)
  .get("/", async (c) => {
    const accounts = await ConnectedAccount.list();
    return c.json({ accounts });
  })
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
      await ConnectedAccount.deleteById(accountId);
      return ctx.json({
        success: true,
      });
    },
  );
