import { Hono } from "hono";
import { Resource } from "sst";
import {
  clearAuthStateCookie,
  getAuthStateCookie,
  getWorkOS,
  setSessionCookie,
} from "@/helpers/auth";
import type { EnvWithUser } from "@/types";

export const callbackRoute = new Hono<EnvWithUser>().get("/", async (c) => {
  const workOS = getWorkOS();

  const code = c.req.query("code");
  const passedNonce = c.req.query("state");
  const { nonce: storedNonce, returnTo } = getAuthStateCookie(c) ?? {};
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

    const { sealedSession } = authenticatedUser;
    if (!sealedSession) {
      throw new Error("No sealed session");
    }
    setSessionCookie(c, sealedSession);

    const redirectUrl = new URL(returnTo ?? "/", Resource.Urls.site);
    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error(error);
    return c.redirect(`${Resource.Urls.site}#login-error`);
  }
});
