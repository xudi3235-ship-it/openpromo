import { getDbClient } from "@core/database/db";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import {
  type Workspace,
  workspacesTable,
} from "@openpromo/core/schemas/workspaces.sql";
import {
  getWorkspacePermissions,
  ORGANIZATION_ROLE,
  type OrganizationRole,
  WORKSPACE_PERMISSION,
  WORKSPACE_ROLE,
  type WorkspacePermission,
  type WorkspaceRole,
} from "@shared/workspace/auth";
import type { User } from "@workos-inc/node";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { createVisibleError } from "./error";
import { getWorkspaceRole, hasWorkspaceRole } from "./role";

export interface WorkspaceRoleCheckInput {
  user: User;
  organizationId: string;
  orgRole: OrganizationRole;
  workspaceId?: string;
  workspaceSlug?: string;
  featureFlags: Context<ApiEnv>["var"]["featureFlags"];
  permissions: Context<ApiEnv>["var"]["permissions"];
}

export interface WorkspaceRoleCheckResult {
  userID: string;
  workspaceID: string;
  organizationID: string;
  role: OrganizationRole;
  email: string;
  workspaceSlug: string;
  featureFlags: Context<ApiEnv>["var"]["featureFlags"];
  permissions: Context<ApiEnv>["var"]["permissions"];
  workspacePermissions: WorkspacePermission[];
  workspaceRole: WorkspaceRole;
}

/**
 * Shared logic for checking workspace role access
 * Can be used by both Hono middleware and oRPC middleware
 */
export async function checkWorkspaceRole(
  input: WorkspaceRoleCheckInput,
  requiredRole: WorkspaceRole,
): Promise<WorkspaceRoleCheckResult> {
  const {
    user,
    organizationId,
    orgRole,
    workspaceId,
    workspaceSlug,
    featureFlags,
    permissions,
  } = input;
  const db = getDbClient();

  // 1. Resolve workspace and ensure it belongs to the user's org
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
    throw createVisibleError(404, {
      message: `Workspace ${workspaceSlug ?? workspaceId} not found`,
    });
  }

  // 2. Check if user has the required role
  if (
    orgRole === ORGANIZATION_ROLE.OWNER ||
    orgRole === ORGANIZATION_ROLE.ADMIN
  ) {
    // Org owner or admin has unrestricted access to all workspaces
    return {
      userID: user.id,
      workspaceID: workspace.id,
      organizationID: organizationId,
      role: orgRole as OrganizationRole,
      email: user.email,
      workspaceSlug: workspace.slug,
      featureFlags,
      permissions,
      workspacePermissions: [WORKSPACE_PERMISSION.ALL], // Org admins get all workspace permissions
      workspaceRole: WORKSPACE_ROLE.ADMIN,
    };
  }

  const workspaceUserRole = await getWorkspaceRole(db, workspace.id, user.id);

  if (!hasWorkspaceRole(workspaceUserRole, requiredRole)) {
    throw createVisibleError(403, {
      message: `Insufficient workspace permissions. User role: ${workspaceUserRole}, Required role: ${requiredRole}.`,
    });
  }

  // Compute workspace permissions based on role
  const workspacePermissions = getWorkspacePermissions(
    workspaceUserRole,
  ) as WorkspacePermission[];

  return {
    userID: user.id,
    workspaceID: workspace.id,
    organizationID: organizationId,
    role: workspaceUserRole as OrganizationRole,
    email: user.email,
    workspaceSlug: workspace.slug,
    featureFlags,
    permissions,
    workspacePermissions,
    // biome-ignore lint/style/noNonNullAssertion: we already checked this with hasWorkspaceRole
    workspaceRole: workspaceUserRole!,
  };
}
