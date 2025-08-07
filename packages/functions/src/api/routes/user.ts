import { Actor } from "@openpromo/core/actor";
import { User } from "@openpromo/core/user/index";
import { UserWorkspace } from "@openpromo/core/user_workspace/index";
import { Hono } from "hono";
import { notPublic } from "../middleware/not-public";

export namespace UserRoutes {
  export const route = new Hono()
    .get("/me", notPublic(), async (ctx) => {
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
    })
    .get("/workspaces", notPublic(), async (ctx) => {
      try {
        // Get all workspaces for this user
        Actor.assert("user");
        const userWorkspaces = await UserWorkspace.userWorkspaces(
          Actor.userID(),
        );

        return ctx.json({
          workspaces: userWorkspaces.map((ws) => ({
            id: ws.workspace.id,
            name: ws.workspace.slug,
            createdAt: ws.workspace.timeCreated,
            updatedAt: ws.workspace.timeUpdated,
            joinedAt: ws.userWorkspace.joinedAt,
            role: ws.userWorkspace.roleId,
          })),
          /* 
            It will return something like:
            {
              workspaces: [  // workspace object
                {
                  id: "wrk_001",
                  name: "my-first-workspace",
                  createdAt: "2024-01-01T10:00:00Z",
                  updatedAt: "2024-01-05T15:30:00Z",
                  joinedAt: "2024-01-01T10:05:00Z",
                  role: "role_admin"
                },
                {
                  id: "wrk_002",
                  name: "shared-workspace",
                  createdAt: "2024-01-03T14:00:00Z",
                  updatedAt: "2024-01-06T09:15:00Z",
                  joinedAt: "2024-01-04T16:20:00Z",
                  role: "role_member"
                }
                // ... more workspaces
              ]
            }
          */
        });
      } catch (error) {
        console.error("Error fetching user workspaces:", error);
        return ctx.json({ error: "Failed to fetch workspaces" }, 500);
      }
    })
    .post("/switch-workspace", notPublic(), async (ctx) => {
      try {
        const { workspaceId } = await ctx.req.json();

        if (!workspaceId) {
          return ctx.json({ error: "Workspace ID is required" }, 400);
        }

        Actor.assert("user");
        await Actor.assertWorkspaceAccess(workspaceId);

        return ctx.json({ success: true });
      } catch (error) {
        console.error("Error switching workspace:", error);
        return ctx.json({ error: "Failed to switch workspace" }, 403);
      }
    });
}
