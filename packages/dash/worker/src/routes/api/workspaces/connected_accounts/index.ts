import { zValidator } from "@hono/zod-validator";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { ConnectedAccount } from "@openpromo/core/connected_account/connected_account";
import { WORKSPACE_ROLE } from "@openpromo/core/workspace/auth";
import { Hono } from "hono";
import * as z from "zod";
import { withAuth } from "../../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { facebookConnectedAccountRoute } from "./facebook";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))
  .route("/facebook", facebookConnectedAccountRoute)
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
