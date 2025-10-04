import { ORGANIZATION_ROLE } from "@openpromo/core/domain/workspace/auth";
import type { getDbClient } from "@openpromo/core/helpers/db/index";
import { getWorkOS } from "@openpromo/core/providers/index";
import { usersTable } from "@openpromo/core/schemas/users.sql";
import { env } from "@openpromo/core/utils/env";
import type { User } from "@workos-inc/node";
import type { Context } from "hono";
import { AppError } from "./error";
import { createWorkspace } from "./workspace";

type DbClient = ReturnType<typeof getDbClient>;

/**
 * Sets the session cookie in the response context
 */
export function setSessionCookie(ctx: Context, sealedSession: string): void {
  ctx.header(
    "Set-Cookie",
    `wos-session=${sealedSession}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

/**
 * Creates a new organization for a user
 */
async function createUserOrganization(user: User) {
  const workOS = getWorkOS();
  const namePrefix =
    user.firstName ?? user.lastName ?? user.email.split("@")[0];
  const orgName = namePrefix ? `${namePrefix}'s Org` : "My Org";

  const organization = await workOS.organizations.createOrganization({
    name: orgName,
  });

  await workOS.userManagement.createOrganizationMembership({
    organizationId: organization.id,
    userId: user.id,
    roleSlug: ORGANIZATION_ROLE.OWNER,
  });

  return organization;
}

/**
 * Refreshes the user's session with the new organization
 */
async function refreshSessionWithOrganization(
  sealedSession: string,
  organizationId: string,
  ctx: Context,
): Promise<void> {
  const workOS = getWorkOS();

  const session = workOS.userManagement.loadSealedSession({
    sessionData: sealedSession,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });

  const refreshResult = await session.refresh({ organizationId });

  if (!refreshResult.authenticated) {
    throw new AppError(500, {
      message: `Failed to refresh session: ${refreshResult.reason}`,
    });
  }

  if (!refreshResult.sealedSession) {
    throw new AppError(500, { message: "No sealed session" });
  }

  setSessionCookie(ctx, refreshResult.sealedSession);
}

/**
 * Creates a default workspace for a new user
 */
async function createDefaultWorkspace(
  db: DbClient,
  user: User,
  organizationId: string,
) {
  const namePrefix =
    user.firstName ?? user.lastName ?? user.email.split("@")[0];
  const workspaceName = namePrefix
    ? `${namePrefix}'s Workspace`
    : "My Workspace";

  return createWorkspace(db, workspaceName, organizationId, user.id);
}

/**
 * Creates a user record in the database with a default workspace
 */
async function createUserWithDefaultWorkspace(
  db: DbClient,
  userId: string,
  workspaceSlug: string,
): Promise<void> {
  await db.insert(usersTable).values({
    workosId: userId,
    defaultWorkspaceSlug: workspaceSlug,
  });
}

/**
 * Bootstraps a new user by:
 * 1. Creating an organization for them
 * 2. Refreshing their session with the new organization
 * 3. Creating a default workspace
 * 4. Creating a user record in the database
 */
export async function bootstrapNewUser(
  db: DbClient,
  user: User,
  ctx: Context,
  sealedSession: string,
): Promise<void> {
  const organization = await createUserOrganization(user);
  await refreshSessionWithOrganization(sealedSession, organization.id, ctx);
  const workspace = await createDefaultWorkspace(db, user, organization.id);
  await createUserWithDefaultWorkspace(db, user.id, workspace.slug);
}
