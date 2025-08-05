import { Actor } from "@openpromo/core/actor";
import { User } from "@openpromo/core/user/index";
import { Hono } from "hono";
import { notPublic } from "../middleware/not-public";

export namespace UserRoutes {
  export const route = new Hono()
    .get("/me", notPublic(), async (ctx) => {
      try {
        const userID = Actor.userID();
        const workspaceID = Actor.workspaceID();
        const email = Actor.email();

        // Get current user in current workspace
        const user = await User.fromID(userID);

        if (!user) {
          return ctx.json({ error: "User not found" }, 404);
        }

        // Get all workspaces for this user (by email)
        const allUserWorkspaces = await User.fromEmail(email as string);

        return ctx.json({
          ...user,
          currentWorkspaceID: workspaceID,
          availableWorkspaces: allUserWorkspaces.map((u) => ({
            id: u.id,
            workspaceID: u.workspaceID,
            name: u.name,
          })),
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        return ctx.json({ error: "Failed to fetch user" }, 500);
      }
    })
    .get("/workspaces", notPublic(), async (ctx) => {
      try {
        const email = Actor.email();

        // Get all workspaces for this user
        const userWorkspaces = await User.fromEmail(email as string);

        return ctx.json({
          workspaces: userWorkspaces.map((u) => ({
            id: u.id,
            workspaceID: u.workspaceID,
            name: u.name,
            email: u.email,
          })),
        });
      } catch (error) {
        console.error("Error fetching user workspaces:", error);
        return ctx.json({ error: "Failed to fetch workspaces" }, 500);
      }
    });
}
