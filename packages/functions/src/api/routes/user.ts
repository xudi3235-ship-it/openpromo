import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { notPublic } from "../middleware/not-public";
import type { MyEnv } from "../routes";

export namespace UserRoutes {
  export const route = new Hono<MyEnv>().get(
    "/me",
    notPublic(),
    async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new HTTPException(500);
      }
      return ctx.json(user);
    },
  );
}
