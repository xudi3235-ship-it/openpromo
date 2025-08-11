import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import { Resource } from "sst";
import { useWorkOS } from "../common";
import type { MyEnv } from "../routes";
import { WORKOS_SESSION_COOKIE_NAME } from "../routes/auth";

export const workosAuth: () => MiddlewareHandler<MyEnv> =
  () => async (c, next) => {
    const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
    const session = useWorkOS().userManagement.loadSealedSession({
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
          setCookie(
            c,
            WORKOS_SESSION_COOKIE_NAME,
            refreshResult.sealedSession,
            {
              domain: Resource.Urls.domain,
              secure: true,
              httpOnly: true,
              sameSite: "None",
              path: "/",
            },
          );
        }
      }
    } catch (error) {
      console.error(error);
      // delete the session cookie if refresh fails
      deleteCookie(c, WORKOS_SESSION_COOKIE_NAME);
    }

    return next();
  };
