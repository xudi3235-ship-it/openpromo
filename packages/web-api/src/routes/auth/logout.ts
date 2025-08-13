import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { Resource } from "sst";
import { getWorkOS, WORKOS_SESSION_COOKIE_NAME } from "../../helpers/workos";
import type { MyEnv } from "../../types";

export const logoutRoute = new Hono<MyEnv>().get("/", async (c) => {
  const workOS = getWorkOS();

  const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
  const session = workOS.userManagement.loadSealedSession({
    sessionData: sessionCookie ?? "",
    cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
  });

  const logoutUrl = await session.getLogoutUrl({
    returnTo: Resource.Urls.site,
  });

  deleteCookie(c, WORKOS_SESSION_COOKIE_NAME);
  return c.redirect(logoutUrl);
});
