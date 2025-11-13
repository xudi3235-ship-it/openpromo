import { Actor } from "@openpromo/core/helpers/actor";
import { ORPCError } from "@orpc/server";
import type { WorkspaceRole } from "@shared/workspace/auth";
import { checkWorkspaceRole } from "../../helpers/workspace-role-checker";
import type { OrpcWorkspaceContext } from "../context";
import { orpcBuilder } from "../context";

type WorkspaceRoleInput = {
  requiredRole: WorkspaceRole;
  workspaceId?: string;
  workspaceSlug?: string;
};

/**
 * Middleware to check workspace role and provide workspace context
 *
 * Usage:
 * ```typescript
 * orpcBuilder
 *   .input(schema)
 *   .use(withWorkspaceRole, workspaceRoleMappers.editor)
 *   .handler(({ context }) => {
 *     // context.workspace is available here
 *   })
 * ```
 */
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
    throw new ORPCError("UNAUTHORIZED", {
      message: "User is not authenticated",
    });
  }

  if (!organizationId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Organization ID is not set in context",
    });
  }

  if (!orgRole) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Organization role is not set in context",
    });
  }

  // 2. Check workspace role using shared logic
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
      },
    });
  });
});
