import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

export const usersRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/me", async (ctx) => {
    const user = ctx.get("user");
    if (!user) {
      throw new HTTPException(401);
    }
    return ctx.json(user);
  });
