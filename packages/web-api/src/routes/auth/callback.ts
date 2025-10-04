import { getDbClient } from "@openpromo/core/helpers/db/index";
import { getWorkOS } from "@openpromo/core/providers/index";
import { usersTable } from "@openpromo/core/schemas/users.sql";
import { env } from "@openpromo/core/utils/env";
import type { User } from "@workos-inc/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  clearAuthStateCookie,
  getAuthState,
  setSessionCookie,
} from "../../helpers/auth";
import { AppError } from "../../helpers/error";
import { handleInvitedUserFirstLogin } from "../../helpers/invite";
import { bootstrapNewUser } from "../../helpers/user-bootstrap";
import type { ApiEnv } from "../../types";

/**
 * Handles a user who is part of an existing organization
 * Checks if this is their first login and handles workspace invites
 */
const handleExistingOrganizationUser = async (
  user: User,
  organizationId: string,
) => {
  const db = getDbClient();
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.workosId, user.id))
    .limit(1);

  if (!existingUser) {
    // New user logging in for the first time - handle workspace invites
    await handleInvitedUserFirstLogin(db, user.id, user.email, organizationId);
  }
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
    if (!passedNonce || !storedNonce || passedNonce !== storedNonce) {
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
      await handleExistingOrganizationUser(
        user,
        authenticatedUser.organizationId,
      );
    } else {
      const db = getDbClient();
      await bootstrapNewUser(db, user, c, sealedSession);
    }

    const redirectUrl = new URL(returnTo ?? "/", env.VITE_DASHBOARD_URL);
    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error(error);
    return c.redirect(`${env.VITE_DASHBOARD_URL}#login-error`);
  }
});
