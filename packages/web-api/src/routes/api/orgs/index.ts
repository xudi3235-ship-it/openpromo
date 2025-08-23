import { Hono } from "hono";
import { assertUser, getWorkOS } from "../../../helpers/auth";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

export const orgsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/", async (ctx) => {
    const workOS = getWorkOS();
    const user = assertUser(ctx);

    const orgs = await workOS.userManagement.listOrganizationMemberships({
      statuses: ["active"],
      userId: user.id,
    });

    return ctx.json(await orgs.autoPagination());
  });
