import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import { Resource } from "sst";
import {
  clearSessionCookie,
  getWorkOS,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "@/helpers/auth";
import type { EnvWithUser } from "@/types";

export const workOSAuth: () => MiddlewareHandler<EnvWithUser> =
  () => async (c, next) => {
    const workOS = getWorkOS();

    try {
      const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
      const session = workOS.userManagement.loadSealedSession({
        sessionData: sessionCookie ?? "",
        cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
      });

      const result = await session.authenticate();

      if (result.authenticated) {
        c.set("user", result.user);
        return next();
      }

      // If the session is invalid, attempt to refresh
      const refreshResult = await session.refresh();
      if (refreshResult.authenticated) {
        c.set("user", refreshResult.user);
        // update the session cookie
        if (refreshResult.sealedSession) {
          setSessionCookie(c, refreshResult.sealedSession);
        }
      }
    } catch (error) {
      console.error(error);
      // clear the session cookie if authentication or refresh fails
      clearSessionCookie(c);
    }

    return next();
  };
