import { Actor } from "@openpromo/core/actor";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { env } from "@openpromo/core/env/index";
import { getWorkOS } from "@openpromo/core/providers/workos";
import type { OrganizationRole } from "@openpromo/core/workspace/auth";
import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import {
  clearSessionCookie,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "../helpers/auth";

export const workOSAuth: () => MiddlewareHandler<ApiEnv> =
  () => async (c, next) => {
    const workOS = getWorkOS();

    try {
      const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
      if (!sessionCookie) {
        return Actor.provide("public", {}, next);
      }

      const session = workOS.userManagement.loadSealedSession({
        sessionData: sessionCookie,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      });

      const result = await session.authenticate();

      if (result.authenticated) {
        c.set("user", result.user);
        c.set("organizationId", result.organizationId);
        c.set("role", result.role as OrganizationRole);
        // this uses node async local storage, so that we can reuse our core business logic in any Nodejs runtimes: worker, lambda, container, etc.
        // feels a bit duplicated compared to hono's ctx, maybe we can use local storage as source of truth?
        return Actor.provide(
          "user",
          {
            userID: result.user.id,
            organizationID: result.organizationId as string,
            role: result.role as OrganizationRole,
            email: result.user.email,
          },
          next,
        );
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
        return Actor.provide(
          "user",
          {
            userID: refreshResult.user.id,
            organizationID: refreshResult.organizationId as string,
            role: refreshResult.role as OrganizationRole,
            email: refreshResult.user.email,
          },
          next,
        );
      } else {
        throw new Error(`Failed to refresh session: ${refreshResult.reason}`);
      }
    } catch (error) {
      console.error(error);
      // clear the session cookie if authentication or refresh fails
      clearSessionCookie(c);
    }

    return Actor.provide("public", {}, next);
  };
