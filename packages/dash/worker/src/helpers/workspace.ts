import type { DbClient } from "@openpromo/core/db/index";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/db/schema/workspace_role_assignments.sql";
import { workspaceRolesTable } from "@openpromo/core/db/schema/workspace_roles.sql";
import { workspacesTable } from "@openpromo/core/db/schema/workspaces.sql";
import { WORKSPACE_ROLE } from "@openpromo/core/workspace/auth";
import { eq } from "drizzle-orm";
import { generateSlug } from "./db";
import { AppError } from "./error";

/**
 * Creates a new workspace for a user and assigns the admin role to the user.
 */
export const createWorkspace = async (
  db: DbClient,
  workspaceName: string,
  organizationId: string,
  userId: string,
) => {
  const slug = await generateSlug(workspaceName, (slug) =>
    db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.slug, slug))
      .limit(1),
  );

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspacesTable)
      .values({
        name: workspaceName,
        organizationId,
        slug: slug,
      })
      .returning();

    const [adminRole] = await tx
      .select()
      .from(workspaceRolesTable)
      .where(eq(workspaceRolesTable.slug, WORKSPACE_ROLE.ADMIN));

    if (!adminRole) {
      throw new AppError(500, {
        message: `${WORKSPACE_ROLE.ADMIN} role not found in the database`,
      });
    }

    await tx.insert(workspaceRoleAssignmentsTable).values({
      workspaceId: workspace.id,
      roleId: adminRole.id,
      assigneeType: "user",
      assigneeId: userId,
    });

    return workspace;
  });
};
