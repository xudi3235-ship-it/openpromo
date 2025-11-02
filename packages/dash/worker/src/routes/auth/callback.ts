import { eq, getDbClient } from "@core/database/db";
import type { ApiEnv } from "@core/helpers/api-env";
import { ensureUserInEnvironment } from "@core/helpers/user-sync";
import { getWorkOS } from "@core/providers/workos";
import { usersTable } from "@core/schemas/users.sql";
import { env } from "@core/utils/env";
import { ORGANIZATION_ROLE } from "@shared/workspace/auth";
import type { User } from "@workos-inc/node";
import { type Context, Hono } from "hono";
import {
  clearAuthStateCookie,
  getAuthState,
  setSessionCookie,
} from "../../helpers/auth";
import { AppError } from "../../helpers/error";
import {
  applyWorkspaceInvitesForUser,
  createWorkspace,
} from "../../helpers/workspace";

const bootstrapNewUser = async (
  user: User,
  ctx: Context<ApiEnv>,
  sealedSession: string,
) => {
  const workOS = getWorkOS();
  const db = getDbClient();

  const namePrefix =
    user.firstName ?? user.lastName ?? user.email.split("@")[0];
  // Create an organization for the user
  const orgName = namePrefix ? `${namePrefix}'s Org` : "My Org";
  const organization = await workOS.organizations.createOrganization({
    name: orgName,
  });
  await workOS.userManagement.createOrganizationMembership({
    organizationId: organization.id,
    userId: user.id,
    roleSlug: ORGANIZATION_ROLE.OWNER,
  });

  // Refresh the user's session with the new organization
  const session = workOS.userManagement.loadSealedSession({
    sessionData: sealedSession,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
  const refreshResult = await session.refresh({
    organizationId: organization.id,
  });
  if (!refreshResult.authenticated) {
    throw new AppError(500, {
      message: `Failed to refresh session: ${refreshResult.reason}`,
    });
  }
  if (!refreshResult.sealedSession) {
    throw new AppError(500, { message: "No sealed session" });
  }
  setSessionCookie(ctx, refreshResult.sealedSession);

  // Create a default workspace for the user
  const workspaceName = namePrefix
    ? `${namePrefix}'s Workspace`
    : "My Workspace";

  const workspace = await createWorkspace(
    db,
    workspaceName,
    organization.id,
    user.id,
  );

  // Create a user record in our database and set the default workspace
  await db.insert(usersTable).values({
    workosId: user.id,
    defaultWorkspaceSlug: workspace.slug,
  });
};

export const callbackRoute = new Hono<ApiEnv>().get("/", async (c) => {
  const workOS = getWorkOS();

  const code = c.req.query("code");
  const passedNonce = c.req.query("state");
  const { nonce: storedNonce, returnTo } = getAuthState(c) ?? {};
  clearAuthStateCookie(c);

  try {
    if (!code) {
      throw new Error("Missing authorization code");
    }
    // For invitation flows, WorkOS doesn't use our nonce, so allow missing state
    // Only validate if both exist
    if (passedNonce && storedNonce && passedNonce !== storedNonce) {
      throw new Error("Authentication state mismatch");
    }

    const authenticatedUser = await workOS.userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
      session: {
        sealSession: true,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      },
    });

    const { sealedSession, user } = authenticatedUser;
    if (!sealedSession) {
      throw new AppError(500, { message: "No sealed session" });
    }

    // bootstrap new user if they don't have an organization
    if (authenticatedUser.organizationId) {
      setSessionCookie(c, sealedSession);

      // Ensure user exists in this environment's database
      const db = getDbClient();
      const dbUser = await ensureUserInEnvironment(db, user.id);

      // If this is a newly created user in this environment, check for workspace invites
      if (!dbUser.defaultWorkspaceSlug) {
        const result = await applyWorkspaceInvitesForUser({
          organizationId: authenticatedUser.organizationId,
          userId: user.id,
          email: user.email,
        });

        // Update user record with first invited workspace as default (if any)
        if (result?.firstWorkspaceSlug) {
          await db
            .update(usersTable)
            .set({ defaultWorkspaceSlug: result.firstWorkspaceSlug })
            .where(eq(usersTable.id, dbUser.id));
        }
      }
    } else {
      await bootstrapNewUser(user, c, sealedSession);
    }

    const redirectUrl = new URL(returnTo ?? "/", env.VITE_DASHBOARD_URL);
    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error(error);
    return c.redirect(`${env.VITE_DASHBOARD_URL}#login-error`);
  }
});
