import { zValidator } from "@hono/zod-validator";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { eq, getDbClient } from "@openpromo/core/helpers/db/index";
import { usersTable } from "@openpromo/core/schema/users.sql";
import { Hono } from "hono";
import * as z from "zod";
import { assertUser } from "../../../helpers/auth";
import { withAuth } from "../../../middleware/with-auth";

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

    return ctx.json({ ...user, ...dbUser });
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
