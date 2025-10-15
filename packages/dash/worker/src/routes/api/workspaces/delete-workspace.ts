import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { usersTable } from "@core/schemas/users.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { assertUser } from "../../../helpers/auth";
import { AppError } from "../../../helpers/error";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";

/**
 * DELETE /workspaces/:workspaceSlug
 * Delete workspace by slug
 */
export const deleteWorkspaceRoute = new Hono<ApiEnv>().delete(
  "/:workspaceSlug",
  zValidator("param", z.object({ workspaceSlug: z.string() })),
  withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  async (ctx) => {
    const db = getDbClient();

    const user = assertUser(ctx);
    const { workspaceSlug } = ctx.req.valid("param");

    const [dbUser] = await db
      .select({
        defaultWorkspaceSlug: usersTable.defaultWorkspaceSlug,
      })
      .from(usersTable)
      .where(eq(usersTable.workosId, user.id))
      .limit(1);

    if (dbUser.defaultWorkspaceSlug === workspaceSlug) {
      throw new AppError(400, {
        userMessage: "Default workspace cannot be deleted",
      });
    }

    const [result] = await db
      .delete(workspacesTable)
      .where(eq(workspacesTable.slug, workspaceSlug))
      .returning();

    return ctx.json({ workspaceId: result?.id });
  },
);
