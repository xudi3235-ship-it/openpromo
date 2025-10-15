import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { ORGANIZATION_ROLE } from "@shared/workspace/auth";
import { Hono } from "hono";
import * as z from "zod";
import { assertOrg, assertUser } from "../../../helpers/auth";
import { createWorkspace } from "../../../helpers/workspace";
import { withOrgRole } from "../../../middleware/with-org-role";
import { zValidator } from "../../../middleware/zod-validator";

/**
 * POST /workspaces
 * Create a new workspace
 */
export const createWorkspaceRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", z.object({ name: z.string() })),
  withOrgRole(ORGANIZATION_ROLE.ADMIN),
  async (ctx) => {
    const db = getDbClient();

    const user = assertUser(ctx);
    const organizationId = assertOrg(ctx);
    const { name } = ctx.req.valid("json");

    const workspace = await createWorkspace(db, name, organizationId, user.id);

    return ctx.json(workspace);
  },
);
