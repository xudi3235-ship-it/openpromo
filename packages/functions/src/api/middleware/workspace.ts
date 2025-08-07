import { Actor } from "@openpromo/core/actor";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono/types";

/**
 * Middleware to verify user has access to the workspace specified in the request
 * Expects workspaceId to be available as a route parameter or query parameter
 */
export const requireWorkspaceAccess: () => MiddlewareHandler =
  () => async (c, next) => {
    console.log("requireWorkspaceAccess middleware triggered");

    // Get workspace ID from route params or query params
    const workspaceId =
      c.req.param("workspaceId") || c.req.query("workspaceId");

    if (!workspaceId) {
      console.log("No workspace ID provided in request");
      throw new HTTPException(400, { message: "Workspace ID is required" });
    }

    try {
      // Verify user has access to this workspace
      await Actor.assertWorkspaceAccess(workspaceId);
      console.log(`User has access to workspace: ${workspaceId}`);

      // Set workspace context in Actor for this request
      const currentActor = Actor.assert("user");

      // Continue with workspace context set
      return Actor.provide(
        "workspace_user",
        {
          userID: currentActor.properties.userID,
          clientID: currentActor.properties.clientID,
          email: currentActor.properties.email,
          workspaceID: workspaceId,
        },
        () => next(),
      );
    } catch (error) {
      console.error("Workspace access check failed:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(403, { message: "Access denied to workspace" });
    }
  };
