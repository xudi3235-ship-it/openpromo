import type { DbClient } from "@core/database/db";
import { getDbClient } from "@core/database/db";
import { workspaceInvitesTable } from "@openpromo/core/schemas/workspace-invites.sql";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/schemas/workspace-role-assignments.sql";
import { workspaceRolesTable } from "@openpromo/core/schemas/workspace-roles.sql";
import { workspacesTable } from "@openpromo/core/schemas/workspaces.sql";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { and, eq } from "drizzle-orm";
import { generateSlug } from "./db";
import { createVisibleError } from "./error";

/**
 * Creates a new workspace for a user and assigns the admin role to the user.
 */
export const createWorkspace = async (
  db: DbClient,
  workspaceName: string,
  organizationId: string,
  userId: string,
) => {
  const slug = await generateSlug(workspaceName, (candidate) =>
    db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.slug, candidate))
      .limit(1),
  );

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspacesTable)
      .values({
        name: workspaceName,
        organizationId,
        slug,
      })
      .returning();

    const [adminRole] = await tx
      .select()
      .from(workspaceRolesTable)
      .where(eq(workspaceRolesTable.slug, WORKSPACE_ROLE.ADMIN));

    if (!adminRole) {
      throw createVisibleError(500, {
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

export async function applyWorkspaceInvitesForUser(params: {
  organizationId?: string | null;
  userId: string;
  email?: string | null;
}): Promise<{ firstWorkspaceSlug: string | null } | undefined> {
  const { organizationId, userId, email } = params;
  if (!organizationId || !email) return;

  const normalizedEmail = email.toLowerCase();
  const db = getDbClient();

  const pendingInvites = await db
    .select({
      id: workspaceInvitesTable.id,
      workspaceId: workspaceInvitesTable.workspaceId,
      roleId: workspaceInvitesTable.roleId,
    })
    .from(workspaceInvitesTable)
    .where(
      and(
        eq(workspaceInvitesTable.organizationId, organizationId),
        eq(workspaceInvitesTable.email, normalizedEmail),
        eq(workspaceInvitesTable.status, "pending"),
      ),
    );

  if (pendingInvites.length === 0) {
    return;
  }

  await Promise.all(
    pendingInvites.map(async ({ id, workspaceId, roleId }) => {
      const [existingAssignment] = await db
        .select({
          id: workspaceRoleAssignmentsTable.id,
          roleId: workspaceRoleAssignmentsTable.roleId,
        })
        .from(workspaceRoleAssignmentsTable)
        .where(
          and(
            eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
            eq(workspaceRoleAssignmentsTable.assigneeId, userId),
          ),
        )
        .limit(1);

      if (!existingAssignment) {
        await db.insert(workspaceRoleAssignmentsTable).values({
          workspaceId,
          roleId,
          assigneeType: "user",
          assigneeId: userId,
        });
      } else if (existingAssignment.roleId !== roleId) {
        await db
          .update(workspaceRoleAssignmentsTable)
          .set({
            roleId,
            updatedAt: new Date(),
          })
          .where(eq(workspaceRoleAssignmentsTable.id, existingAssignment.id));
      }

      await db
        .update(workspaceInvitesTable)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(workspaceInvitesTable.id, id));
    }),
  );

  const [firstWorkspace] = await db
    .select({ slug: workspacesTable.slug })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, pendingInvites[0].workspaceId))
    .limit(1);

  return {
    firstWorkspaceSlug: firstWorkspace?.slug ?? null,
  };
}
