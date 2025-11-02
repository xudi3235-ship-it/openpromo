import { getDbClient } from "@core/database/db";
import { ensureUserInEnvironment } from "@core/helpers/user-sync";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { authenticateWithCookie } from "@openpromo/core/helpers/auth";
import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono/types";
import {
  clearSessionCookie,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "../helpers/auth";

export const workOSAuth: () => MiddlewareHandler<ApiEnv> =
  () => async (c, next) => {
    try {
      const sessionCookie = getCookie(c, WORKOS_SESSION_COOKIE_NAME);
      if (!sessionCookie) {
        return Actor.provide("public", {}, next);
      }

      const result = await authenticateWithCookie({
        cookie: sessionCookie,
        withRefresh: true,
        onRefreshSuccess: (sealedSession) => {
          setSessionCookie(c, sealedSession);
        },
        onRefreshFailure: (reason) => {
          console.error(`Failed to refresh session: ${reason}`);
        },
      });

      if (result.authenticated) {
        // Ensure user exists in this environment's database
        // This handles multi-environment isolation where WorkOS is shared but DBs are separate
        const db = getDbClient();
        const dbUser = await ensureUserInEnvironment(db, result.user.id);

        c.set("user", result.user);
        c.set("organizationId", result.organizationId);
        c.set("role", result.role);
        c.set("featureFlags", result.featureFlags ?? []);
        c.set("permissions", result.permissions ?? []);
        // this uses node async local storage, so that we can reuse our core business logic in any Nodejs runtimes: worker, lambda, container, etc.
        // feels a bit duplicated compared to hono's ctx, maybe we can use local storage as source of truth?
        return Actor.provide(
          "user",
          {
            userID: result.user.id, // WorkOS user ID (shared across environments)
            dbUserID: dbUser.id, // Environment-specific database user ID
            organizationID: result.organizationId,
            role: result.role,
            email: result.user.email,
            featureFlags: result.featureFlags,
            permissions: result.permissions ?? [],
          },
          next,
        );
      } else {
        throw new Error(`Failed to authenticate session: ${result.reason}`);
      }
    } catch (error) {
      console.error(error);
      // clear the session cookie if authentication or refresh fails
      clearSessionCookie(c);
    }

    return Actor.provide("public", {}, next);
  };
