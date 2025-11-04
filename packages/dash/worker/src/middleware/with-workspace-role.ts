import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import type { WorkspaceRole } from "@shared/workspace/auth";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import { assertOrg, assertUser } from "../helpers/auth";
import { checkWorkspaceRole } from "../helpers/workspace-role-checker";

/**
 * Middleware to check if the user has the required workspace role
 *
 * `workspaceId` or `workspaceSlug` is required in the path
 * @param requiredRole - The required workspace role
 */
export const withWorkspaceRole: (
  requiredRole: WorkspaceRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  // 1. assert user and org
  const user = assertUser(c);
  const organizationId = assertOrg(c);
  const orgRole = c.get("role");

  if (!orgRole) {
    throw new Error("Organization role is not set in context");
  }

  // 2. Extract workspace identifiers from params
  const workspaceId = c.req.param("workspaceId");
  const workspaceSlug = c.req.param("workspaceSlug");

  // 3. Check workspace role using shared logic
  const workspaceCtx = await checkWorkspaceRole(
    {
      user,
      organizationId,
      orgRole,
      workspaceId,
      workspaceSlug,
      featureFlags: c.get("featureFlags"),
      permissions: c.get("permissions"),
    },
    requiredRole,
  );

  // 4. Provide workspace context to Actor
  return Actor.provide("workspace_user", workspaceCtx, next);
};
