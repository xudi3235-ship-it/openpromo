import type { getDbClient } from "@openpromo/core/helpers/db/index";
import { usersTable } from "@openpromo/core/schemas/users.sql";
import { workspaceInvitesTable } from "@openpromo/core/schemas/workspace-invites.sql";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/schemas/workspace-role-assignments.sql";
import { workspacesTable } from "@openpromo/core/schemas/workspaces.sql";
import { and, eq } from "drizzle-orm";

type DbClient = ReturnType<typeof getDbClient>;

type PendingInvite = {
  id: string;
  workspaceId: string;
  roleId: string;
  email: string;
};

/**
 * Finds all pending workspace invites for a user's email in an organization
 */
export async function getPendingInvites(
  db: DbClient,
  email: string,
  organizationId: string,
): Promise<PendingInvite[]> {
  const normalizedEmail = email.toLowerCase();

  return db
    .select({
      id: workspaceInvitesTable.id,
      workspaceId: workspaceInvitesTable.workspaceId,
      roleId: workspaceInvitesTable.roleId,
      email: workspaceInvitesTable.email,
    })
    .from(workspaceInvitesTable)
    .where(
      and(
        eq(workspaceInvitesTable.email, normalizedEmail),
        eq(workspaceInvitesTable.organizationId, organizationId),
        eq(workspaceInvitesTable.status, "pending"),
      ),
    );
}

/**
 * Accepts a workspace invite by creating a role assignment and marking the invite as accepted
 */
export async function acceptInvite(
  db: DbClient,
  invite: PendingInvite,
  userId: string,
): Promise<void> {
  // Create workspace role assignment
  await db.insert(workspaceRoleAssignmentsTable).values({
    workspaceId: invite.workspaceId,
    roleId: invite.roleId,
    assigneeType: "user",
    assigneeId: userId,
  });

  // Mark invite as accepted
  await db
    .update(workspaceInvitesTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(workspaceInvitesTable.id, invite.id));
}

/**
 * Gets the workspace slug by workspace ID
 */
export async function getWorkspaceSlug(
  db: DbClient,
  workspaceId: string,
): Promise<string | null> {
  const [workspace] = await db
    .select({ slug: workspacesTable.slug })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);

  return workspace?.slug ?? null;
}

/**
 * Creates a user record in the database
 */
export async function createUserRecord(
  db: DbClient,
  workosId: string,
  defaultWorkspaceSlug: string | null,
): Promise<void> {
  await db.insert(usersTable).values({
    workosId,
    defaultWorkspaceSlug,
  });
}

/**
 * Updates the user's default workspace slug
 */
export async function updateUserDefaultWorkspace(
  db: DbClient,
  workosId: string,
  workspaceSlug: string,
): Promise<void> {
  await db
    .update(usersTable)
    .set({ defaultWorkspaceSlug: workspaceSlug })
    .where(eq(usersTable.workosId, workosId));
}

/**
 * Handles workspace invite acceptance for a new user
 * Accepts all pending invites and sets the first workspace as default
 */
export async function handleInvitedUserFirstLogin(
  db: DbClient,
  userId: string,
  userEmail: string,
  organizationId: string,
): Promise<void> {
  const pendingInvites = await getPendingInvites(db, userEmail, organizationId);

  if (pendingInvites.length === 0) {
    // No invites found - create user record without default workspace
    await createUserRecord(db, userId, null);
    return;
  }

  // Accept all invites
  for (const invite of pendingInvites) {
    await acceptInvite(db, invite, userId);
  }

  // Create user record
  await createUserRecord(db, userId, null);

  // Set the first invited workspace as default
  const workspaceSlug = await getWorkspaceSlug(
    db,
    pendingInvites[0].workspaceId,
  );
  if (workspaceSlug) {
    await updateUserDefaultWorkspace(db, userId, workspaceSlug);
  }
}
