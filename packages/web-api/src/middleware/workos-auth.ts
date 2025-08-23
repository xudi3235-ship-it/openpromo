import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import { Resource } from "sst";
import type { OrganizationRole } from "../constants/auth";
import {
  clearSessionCookie,
  getWorkOS,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "../helpers/auth";
import type { ApiEnv } from "../types";

export const workOSAuth: () => MiddlewareHandler<ApiEnv> =
  () => async (c, next) => {
    const workOS = getWorkOS();

    try {
      const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
      if (!sessionCookie) {
        return next();
      }

      const session = workOS.userManagement.loadSealedSession({
        sessionData: sessionCookie,
        cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
      });

      const result = await session.authenticate();

      if (result.authenticated) {
        c.set("user", result.user);
        c.set("organizationId", result.organizationId);
        c.set("role", result.role as OrganizationRole);
        return next();
      }

      // If the session is invalid, attempt to refresh
      const refreshResult = await session.refresh();
      if (refreshResult.authenticated) {
        c.set("user", refreshResult.user);
        c.set("organizationId", refreshResult.organizationId);
        c.set("role", refreshResult.role as OrganizationRole);
        // update the session cookie
        if (refreshResult.sealedSession) {
          setSessionCookie(c, refreshResult.sealedSession);
        }
      } else {
        throw new Error(`Failed to refresh session: ${refreshResult.reason}`);
      }
    } catch (error) {
      console.error(error);
      // clear the session cookie if authentication or refresh fails
      clearSessionCookie(c);
    }

    return next();
  };
