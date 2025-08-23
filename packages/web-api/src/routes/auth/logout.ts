import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { Resource } from "sst";
import {
  clearSessionCookie,
  getWorkOS,
  WORKOS_SESSION_COOKIE_NAME,
} from "../../helpers/auth";

export const logoutRoute = new Hono().get("/", async (c) => {
  const workOS = getWorkOS();

  const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return c.redirect(Resource.Urls.site);
  }

  try {
    const session = workOS.userManagement.loadSealedSession({
      sessionData: sessionCookie ?? "",
      cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
    });

    const logoutUrl = await session.getLogoutUrl({
      returnTo: Resource.Urls.site,
    });

    clearSessionCookie(c);
    return c.redirect(logoutUrl);
  } catch (error) {
    console.error(error);

    // if the session is invalid, clear the session cookie and redirect to the site
    clearSessionCookie(c);
    return c.redirect(Resource.Urls.site);
  }
});
