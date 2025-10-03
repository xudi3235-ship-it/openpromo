import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { getWorkOS } from "@core/providers/workos";
import { workspaceRoleAssignmentsTable } from "@core/schemas/workspace-role-assignments.sql";
import { workspaceRolesTable } from "@core/schemas/workspace-roles.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import type { User } from "@workos-inc/node";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { AppError } from "../../../helpers/error";
import { withAuth } from "../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";

export type WorkspaceMemberRole = {
  id: string;
  slug: string;
  name: string;
  description?: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  roleId: string;
  role: WorkspaceMemberRole;
  user: Partial<User>;
};

export const workspaceTeamRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.VIEWER))
  .get("/", async (ctx) => {
    const workspaceSlug = ctx.req.param("workspaceSlug");
    if (!workspaceSlug)
      throw new AppError(400, { message: "Workspace slug is required" });
    const db = getDbClient();
    const workOS = getWorkOS();

    const assignments = await db
      .select({
        id: workspaceRoleAssignmentsTable.id,
        workspaceId: workspaceRoleAssignmentsTable.workspaceId,
        assigneeId: workspaceRoleAssignmentsTable.assigneeId,
        roleId: workspaceRoleAssignmentsTable.roleId,
        roleName: workspaceRolesTable.name,
        roleSlug: workspaceRolesTable.slug,
        roleDescription: workspaceRolesTable.description,
      })
      .from(workspaceRoleAssignmentsTable)
      .innerJoin(
        workspacesTable,
        eq(workspaceRoleAssignmentsTable.workspaceId, workspacesTable.id),
      )
      .innerJoin(
        workspaceRolesTable,
        eq(workspaceRoleAssignmentsTable.roleId, workspaceRolesTable.id),
      )
      .where(
        and(
          eq(workspacesTable.slug, workspaceSlug),
          eq(workspaceRoleAssignmentsTable.assigneeType, "user"),
        ),
      );
    // fetch user details from WorkOS
    const members = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await workOS.userManagement.getUser(assignment.assigneeId);
        return {
          id: assignment.id,
          workspaceId: assignment.workspaceId,
          roleId: assignment.roleId,
          role: {
            id: assignment.roleId,
            slug: assignment.roleSlug,
            name: assignment.roleName,
            description: assignment.roleDescription ?? undefined,
          },
          user: {
            id: user.id,
            email: user.email ?? undefined,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          },
        } satisfies WorkspaceMember;
      }),
    );

    return ctx.json({ members });
  });
