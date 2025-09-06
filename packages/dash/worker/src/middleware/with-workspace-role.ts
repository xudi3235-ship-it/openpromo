import { Actor } from "@openpromo/core/actor";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { getDbClient } from "@openpromo/core/db/index";
import {
  type Workspace,
  workspacesTable,
} from "@openpromo/core/db/schema/workspaces.sql";
import {
  ORGANIZATION_ROLE,
  type OrganizationRole,
  type WorkspaceRole,
} from "@openpromo/core/workspace/auth";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import { assertOrg, assertUser } from "../helpers/auth";
import { AppError } from "../helpers/error";
import { getWorkspaceRole, hasWorkspaceRole } from "../helpers/role";

/**
 * Middleware to check if the user has the required workspace role
 *
 * `workspaceId` or `workspaceSlug` is required in the path
 * @param requiredRole - The required workspace role
 */
export const withWorkspaceRole: (
  requiredRole: WorkspaceRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  const orgRole = c.get("role");
  const db = getDbClient();
  const workspaceId = c.req.param("workspaceId");
  const workspaceSlug = c.req.param("workspaceSlug");

  // 1. assert user and org
  const user = assertUser(c);
  const organizationId = assertOrg(c);

  // 2. resolve workspace and ensure it belongs to the user's org
  let workspace: Workspace | undefined;

  if (workspaceId) {
    const [ws] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(
          eq(workspacesTable.id, workspaceId),
          eq(workspacesTable.organizationId, organizationId),
        ),
      )
      .limit(1);
    workspace = ws;
  } else if (workspaceSlug) {
    const [ws] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(
          eq(workspacesTable.slug, workspaceSlug),
          eq(workspacesTable.organizationId, organizationId),
        ),
      )
      .limit(1);
    workspace = ws;
  }

  if (!workspace) {
    throw new AppError(404, {
      message: `Workspace ${workspaceSlug ?? workspaceId} not found`,
    });
  }

  const workspaceCtx = {
    userID: user.id,
    workspaceID: workspace.id,
    organizationID: organizationId,
    role: orgRole as OrganizationRole,
    email: user.email,
    workspaceSlug: workspace.slug,
  };

  // 3. check if user has the required role
  if (
    orgRole === ORGANIZATION_ROLE.OWNER ||
    orgRole === ORGANIZATION_ROLE.ADMIN
  ) {
    // org owner or admin has unrestricted access to all workspaces
    return Actor.provide("workspace_user", workspaceCtx, next);
  }

  const workspaceUserRole = await getWorkspaceRole(db, workspaceId, user.id);

  if (!hasWorkspaceRole(workspaceUserRole, requiredRole)) {
    throw new AppError(403, {
      message: `Insufficient workspace permissions. User role: ${workspaceUserRole}, Required role: ${requiredRole}.`,
    });
  }
  // scoped selector
  return Actor.provide(
    "workspace_user",
    {
      ...workspaceCtx,
      role: workspaceUserRole as OrganizationRole,
    },
    next,
  );
};
