import { zValidator } from "@hono/zod-validator";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { env } from "@openpromo/core/env/index";
import { getWorkOS } from "@openpromo/core/workos/index";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import * as z from "zod";
import {
  assertOrg,
  assertUser,
  setSessionCookie,
  WORKOS_SESSION_COOKIE_NAME,
} from "../../../helpers/auth";
import { AppError } from "../../../helpers/error";
import { withAuth } from "../../../middleware/with-auth";

export const orgsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/", async (ctx) => {
    const workOS = getWorkOS();
    const user = assertUser(ctx);

    const orgs = await workOS.userManagement.listOrganizationMemberships({
      statuses: ["active"],
      userId: user.id,
    });

    return ctx.json(await orgs.autoPagination());
  })
  .get("/current", async (ctx) => {
    const orgId = assertOrg(ctx);

    return ctx.json({ id: orgId });
  })
  .post(
    "/switch",
    zValidator("json", z.object({ organizationId: z.string() })),
    async (ctx) => {
      const workOS = getWorkOS();
      const sessionCookie = getCookie(ctx, WORKOS_SESSION_COOKIE_NAME);
      const { organizationId } = ctx.req.valid("json");

      if (!sessionCookie) {
        throw new AppError(500, {
          message: "Assertion failed: session cookie is not present",
        });
      }

      const session = workOS.userManagement.loadSealedSession({
        sessionData: sessionCookie,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      });

      const refreshResult = await session.refresh({ organizationId });
      if (refreshResult.authenticated && refreshResult.sealedSession) {
        setSessionCookie(ctx, refreshResult.sealedSession);
        return ctx.json({ organizationId });
      } else {
        throw new AppError(500, {
          message: "Failed to switch organization",
        });
      }
    },
  );
