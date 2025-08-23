import { Hono } from "hono";
import { Resource } from "sst";
import { WorkOSOrganizationRole } from "@/constants/auth";
import {
  clearAuthStateCookie,
  getAuthState,
  getWorkOS,
  setSessionCookie,
} from "@/helpers/auth";
import type { ApiEnv } from "@/types";

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
      clientId: Resource.WORKOS_CLIENT_ID.value,
      session: {
        sealSession: true,
        cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
      },
    });

    const { sealedSession, user, organizationId } = authenticatedUser;
    if (!sealedSession) {
      throw new Error("No sealed session");
    }
    setSessionCookie(c, sealedSession);

    // Create an organization for the user if it doesn't exist
    if (!organizationId) {
      const orgNamePrefix =
        user.firstName ?? user.lastName ?? user.email.split("@")[0];
      const orgName = orgNamePrefix ? `${orgNamePrefix}'s Org` : "My Org";
      const organization = await workOS.organizations.createOrganization({
        name: orgName,
      });
      await workOS.userManagement.createOrganizationMembership({
        organizationId: organization.id,
        userId: user.id,
        roleSlug: WorkOSOrganizationRole.OWNER,
      });
    }

    const redirectUrl = new URL(returnTo ?? "/", Resource.Urls.site);
    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error(error);
    return c.redirect(`${Resource.Urls.site}#login-error`);
  }
});
