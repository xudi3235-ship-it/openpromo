import { Hono } from "hono";
import { assertUser } from "../../../helpers/auth";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

export const usersRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/me", async (ctx) => {
    const user = assertUser(ctx);

    return ctx.json(user);
  });
