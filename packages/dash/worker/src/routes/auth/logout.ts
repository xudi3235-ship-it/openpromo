import { getWorkOS } from "@core/providers/workos";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  clearSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "../../helpers/auth";

export const logoutRoute = new Hono().get("/", async (c) => {
  const workOS = getWorkOS();

  const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return c.redirect(env.DASHBOARD_URL);
  }

  try {
    const session = workOS.userManagement.loadSealedSession({
      sessionData: sessionCookie ?? "",
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    const logoutUrl = await session.getLogoutUrl({
      returnTo: env.DASHBOARD_URL,
    });

    clearSessionCookie(c);
    return c.redirect(logoutUrl);
  } catch (error) {
    console.error(error);

    // if the session is invalid, clear the session cookie and redirect to the site
    clearSessionCookie(c);
    return c.redirect(env.DASHBOARD_URL);
  }
});
