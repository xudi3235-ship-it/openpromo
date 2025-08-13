import { deleteCookie, getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import { Resource } from "sst";
import {
  getWorkOS,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "@/helpers/workos";
import type { MyEnv } from "@/types";

// console.log(process.env);

export const workOSAuth: () => MiddlewareHandler<MyEnv> =
  () => async (c, next) => {
    const workOS = getWorkOS();

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
    try {
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
      // delete the session cookie if refresh fails
      deleteCookie(c, WORKOS_SESSION_COOKIE_NAME);
    }

    return next();
  };
