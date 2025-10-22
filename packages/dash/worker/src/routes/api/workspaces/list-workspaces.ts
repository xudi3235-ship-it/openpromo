import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { workspaceRoleAssignmentsTable } from "@core/schemas/workspace-role-assignments.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { ORGANIZATION_ROLE } from "@shared/workspace/auth";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { assertOrg, assertUser } from "../../../helpers/auth";

/**
 * GET /workspaces
 * List all workspaces a user has access to
 */
export const listWorkspacesRoute = new Hono<ApiEnv>().get("/", async (ctx) => {
  const db = getDbClient();
  const role = ctx.get("role");
  const user = assertUser(ctx);
  const organizationId = assertOrg(ctx);

  // if the user is an admin or owner, they have unrestricted access to all workspaces in the organization
  if (role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER) {
    const workspaces = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.organizationId, organizationId));
    return ctx.json(workspaces);
  }

  // Otherwise, get the workspaces the user has access to
  const workspaces = await db
    .select({
      id: workspacesTable.id,
      name: workspacesTable.name,
      slug: workspacesTable.slug,
      profilePictureUrl: workspacesTable.profilePictureUrl,
      profilePictureKey: workspacesTable.profilePictureKey,
    })
    .from(workspacesTable)
    .innerJoin(
      workspaceRoleAssignmentsTable,
      eq(workspacesTable.id, workspaceRoleAssignmentsTable.workspaceId),
    )
    .where(
      and(
        eq(workspaceRoleAssignmentsTable.assigneeId, user.id),
        eq(workspacesTable.organizationId, organizationId),
      ),
    );

  return ctx.json(workspaces);
});
