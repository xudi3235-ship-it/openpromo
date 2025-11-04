import type { ApiEnv } from "@core/helpers/api-env";
import { Actor } from "@openpromo/core/helpers/actor";
import { os } from "@orpc/server";
import type { WorkspaceRole } from "@shared/workspace/auth";
import type { Context } from "hono";
import type { WorkspaceRoleCheckResult } from "../helpers/workspace-role-checker";

// Shared context for every oRPC procedure so we can attach hono context data.
export interface OrpcContext {
  honoContext: Context<ApiEnv>;
}

export interface OrpcWorkspaceContext extends OrpcContext {
  workspace: WorkspaceRoleCheckResult;
}

export const orpcBuilder = os.$context<OrpcContext>();

export const withWorkspaceRoleMiddleware = orpcBuilder.middleware(
  async ({ context, next }, requiredRole: WorkspaceRole) => {
    const { honoContext } = context;

    // 1. Get user and org from hono context
    const user = honoContext.get("user");
    const organizationId = honoContext.get("organizationId");
    const orgRole = honoContext.get("role");

    if (!user) {
      throw new Error("User is not authenticated");
    }

    if (!organizationId) {
      throw new Error("Organization ID is not set in context");
    }

    if (!orgRole) {
      throw new Error("Organization role is not set in context");
    }

    // 2. Extract workspace identifiers from params
    const workspaceId = honoContext.req.param("workspaceId");
    const workspaceSlug = honoContext.req.param("workspaceSlug");

    // 3. Check workspace role using shared logic
    const { checkWorkspaceRole } = await import(
      "../helpers/workspace-role-checker"
    );
    const workspaceCtx = await checkWorkspaceRole(
      {
        user,
        organizationId,
        orgRole,
        workspaceId,
        workspaceSlug,
        featureFlags: honoContext.get("featureFlags"),
        permissions: honoContext.get("permissions"),
      },
      requiredRole,
    );

    // 4. Provide workspace context to Actor (Node.js async local storage)
    return Actor.provide("workspace_user", workspaceCtx, async () => {
      // 5. Pass workspace context to next handler
      return next({
        context: {
          ...context,
          workspace: workspaceCtx,
        },
      });
    });
  },
);
