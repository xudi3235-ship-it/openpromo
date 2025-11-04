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

type WorkspaceRoleInput = {
  requiredRole: WorkspaceRole;
  workspaceId?: string;
  workspaceSlug?: string;
};

export const withWorkspaceRole = orpcBuilder.middleware<
  OrpcWorkspaceContext,
  WorkspaceRoleInput
>(async ({ context, next }, input: WorkspaceRoleInput) => {
  const { honoContext } = context;
  const { requiredRole, workspaceId, workspaceSlug } = input;

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

  // 2. Check workspace role using shared logic
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

  // 3. Provide workspace context to Actor (Node.js async local storage)
  return Actor.provide("workspace_user", workspaceCtx, async () => {
    // 4. Pass workspace context to next handler
    return next({
      context: {
        ...context,
        workspace: workspaceCtx,
      } as OrpcWorkspaceContext,
    });
  });
});
