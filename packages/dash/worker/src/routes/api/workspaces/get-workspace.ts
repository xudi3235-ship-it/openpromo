import { getDbClient } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../helpers/error";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";

/**
 * GET /workspaces/:workspaceSlug
 * Get workspace by slug with connected accounts
 */
export const getWorkspaceRoute = new Hono<ApiEnv>().get(
  "/:workspaceSlug",
  zValidator("param", z.object({ workspaceSlug: z.string() })),
  withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  async (ctx) => {
    const db = getDbClient();
    const actor = Actor.assert("workspace_user");

    const { workspaceSlug } = ctx.req.valid("param");

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.slug, workspaceSlug))
      .limit(1);

    if (!workspace) {
      throw new AppError(404, {
        message: `Workspace ${workspaceSlug} not found`,
      });
    }

    return ctx.json({
      ...workspace,
      actor: {
        userPermissions: actor.properties.workspacePermissions,
        workspaceRole: actor.properties.workspaceRole,
      },
    });
  },
);
