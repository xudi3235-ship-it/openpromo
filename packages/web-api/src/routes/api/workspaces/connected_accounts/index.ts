import { ConnectedAccount } from "@openpromo/core/connected_account/connected_account";
import { WORKSPACE_ROLE } from "@openpromo/core/workspace/auth";
import { Hono } from "hono";
import { withAuth } from "../../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import type { ApiEnv } from "../../../../types";
import { facebookConnectedAccountRoute } from "./facebook";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))

  .route("/facebook", facebookConnectedAccountRoute)
  .get("/", async (c) => {
    const accounts = await ConnectedAccount.list();
    return c.json(accounts);
  });
