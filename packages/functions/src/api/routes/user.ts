import { Actor } from "@openpromo/core/actor";
import { User } from "@openpromo/core/user/index";
import { Hono } from "hono";
import { notPublic } from "../middleware/not-public";

export namespace UserRoutes {
  export const route = new Hono().get("/me", notPublic(), async (ctx) => {
    try {
      // Get current user
      Actor.assert("user");
      const user = await User.fromID(Actor.userID());

      if (!user) {
        return ctx.json({ error: "User not found" }, 404);
      }

      return ctx.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return ctx.json({ error: "Failed to fetch user" }, 500);
    }
  });
}
