import { Actor } from "@openpromo/core/actor";
import { UserWorkspace } from "@openpromo/core/user_workspace/index";
import { Hono } from "hono";
import { z } from "zod";
import { notPublic } from "../middleware/not-public";

export interface FormattedWorkspace {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  joinedAt: Date | null;
  role: string;
}

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  joinedAt: z.coerce.date().nullable(),
  role: z.string(),
});

const WorkspacesResponseSchema = z.object({
  workspaces: z.array(WorkspaceSchema),
});

export type WorkspacesResponse = z.infer<typeof WorkspacesResponseSchema>;

export namespace Workspace {
  export const route = new Hono()
    .get("/", notPublic(), async (ctx) => {
      try {
        // Get all workspaces for this user
        Actor.assert("user");
        const userId = Actor.userID();
        const userWorkspaces = await UserWorkspace.userWorkspaces(userId);
        const formattedWorkspaces: FormattedWorkspace[] = userWorkspaces.map(
          (ws) => ({
            id: ws.workspace.id,
            name: ws.workspace.slug,
            createdAt: ws.workspace.timeCreated,
            updatedAt: ws.workspace.timeUpdated,
            joinedAt: ws.userWorkspace.joinedAt,
            role: ws.userWorkspace.roleId,
          }),
        );
        return ctx.json({
          workspaces: formattedWorkspaces,
        } as WorkspacesResponse);
      } catch (error) {
        console.error("Error fetching user workspaces:", error);
        throw error;
      }
    })
    .post("/switch", notPublic(), async (ctx) => {
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
