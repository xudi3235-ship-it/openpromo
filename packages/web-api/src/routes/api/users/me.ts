import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { withAuth } from "@/middleware/with-auth";
import type { EnvWithUser } from "@/types";

export const meRoute = new Hono<EnvWithUser>().get(
  "/",
  withAuth(),
  async (ctx) => {
    const user = ctx.get("user");
    if (!user) {
      throw new HTTPException(500);
    }
    return ctx.json(user);
  },
);
