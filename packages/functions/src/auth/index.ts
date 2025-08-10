import { WorkOS } from "@workos-inc/node";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Resource } from "sst";

export const WORKOS_SESSION_COOKIE_NAME = "wos-session";

const hono = new Hono();
const workos = new WorkOS(Resource.WORKOS_API_KEY.value, {
  clientId: Resource.WORKOS_CLIENT_ID.value,
});

hono.get("/login", (c) => {
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    redirectUri: `${Resource.Urls.auth}/callback`,
    clientId: Resource.WORKOS_CLIENT_ID.value,
  });

  return c.redirect(authorizationUrl);
});

hono.get("/callback", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.json({ error: "No code provided" }, 400);
  }

  try {
    const authenticatedUser = await workos.userManagement.authenticateWithCode({
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

    setCookie(c, WORKOS_SESSION_COOKIE_NAME, sealedSession, {
      domain: Resource.Urls.domain,
      secure: true,
      httpOnly: true,
      sameSite: "None",
      path: "/",
    });

    return c.redirect(Resource.Urls.site);
  } catch (error) {
    console.error(error);
    return c.redirect(`${Resource.Urls.site}/login`);
  }
});

hono.get("/logout", async (c) => {
  const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
  const session = workos.userManagement.loadSealedSession({
    sessionData: sessionCookie ?? "",
    cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
  });

  const logoutUrl = await session.getLogoutUrl();

  deleteCookie(c, WORKOS_SESSION_COOKIE_NAME);
  return c.redirect(logoutUrl);
});

export const handler = handle(hono);
