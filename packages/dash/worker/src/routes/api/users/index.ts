import type { ApiEnv } from "@core/helpers/api-env";
import { eq, getDbClient } from "@core/helpers/db";
import { usersTable } from "@core/schemas/users.sql";
import { Hono } from "hono";
import * as z from "zod";
import { assertUser } from "../../../helpers/auth";
import { withAuth } from "../../../middleware/with-auth";
import { zValidator } from "../../../middleware/zod-validator";

export const usersRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/me", async (ctx) => {
    const user = assertUser(ctx);
    const db = getDbClient();

    const [dbUser] = await db
      .select({
        defaultWorkspaceSlug: usersTable.defaultWorkspaceSlug,
      })
      .from(usersTable)
      .where(eq(usersTable.workosId, user.id))
      .limit(1);

    // FIXME: we should refactor this, we wanna see how to have a single source of truth for user data
    return ctx.json({
      ...user,
      ...dbUser,
      featureFlags: ctx.get("featureFlags"),
      permissions: ctx.get("permissions"),
    });
  })
  .patch(
    "/metadata",
    zValidator(
      "json",
      z.object({ defaultWorkspaceSlug: z.string().optional() }),
    ),
    async (ctx) => {
      const db = getDbClient();

      const user = assertUser(ctx);
      const metadata = ctx.req.valid("json");

      const [updatedUser] = await db
        .update(usersTable)
        .set({ ...metadata })
        .where(eq(usersTable.workosId, user.id));

      return ctx.json({ user: updatedUser });
    },
  );
