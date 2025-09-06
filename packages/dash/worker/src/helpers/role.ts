import type { DbClient } from "@openpromo/core/db/index";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/db/schema/workspace_role_assignments.sql";
import { workspaceRolesTable } from "@openpromo/core/db/schema/workspace_roles.sql";
import {
  ORGANIZATION_ROLE,
  type OrganizationRole,
  WORKSPACE_ROLE,
  type WorkspaceRole,
} from "@openpromo/core/workspace/auth";
import { and, eq } from "drizzle-orm";

/**
 * Role hierarchy levels for organization roles
 * Higher numbers indicate more privileges
 */
export const ORG_ROLE_LEVELS = {
  [ORGANIZATION_ROLE.OWNER]: 3,
  [ORGANIZATION_ROLE.ADMIN]: 2,
  [ORGANIZATION_ROLE.MEMBER]: 1,
} as const;

/**
 * Role hierarchy levels for workspace roles
 * Higher numbers indicate more privileges
 */
export const WORKSPACE_ROLE_LEVELS = {
  [WORKSPACE_ROLE.ADMIN]: 3,
  [WORKSPACE_ROLE.EDITOR]: 2,
  [WORKSPACE_ROLE.VIEWER]: 1,
} as const;

/**
 * Check if a user has at least the required organization role
 * @param userRole - The user's current organization role
 * @param requiredRole - The minimum required role level
 * @returns true if user has sufficient privileges
 */
export function hasOrgRole(
  userRole: OrganizationRole | undefined,
  requiredRole: OrganizationRole,
): boolean {
  if (!userRole) return false;

  const userLevel = ORG_ROLE_LEVELS[userRole];
  const requiredLevel = ORG_ROLE_LEVELS[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Check if a user has at least the required workspace role
 * @param userRole - The user's current workspace role
 * @param requiredRole - The minimum required role level
 * @returns true if user has sufficient privileges
 */
export function hasWorkspaceRole(
  userRole: WorkspaceRole | undefined,
  requiredRole: WorkspaceRole,
): boolean {
  if (!userRole) return false;

  const userLevel = WORKSPACE_ROLE_LEVELS[userRole];
  const requiredLevel = WORKSPACE_ROLE_LEVELS[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Get the workspace role of a user
 * @param hyperdrive - The hyperdrive instance
 * @param workspaceId - The ID of the workspace
 * @param userId - The ID of the user
 * @returns The workspace role of the user
 */
export async function getWorkspaceRole(
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | undefined> {
  const workspaceRole = await db
    .select({ slug: workspaceRolesTable.slug })
    .from(workspaceRoleAssignmentsTable)
    .innerJoin(
      workspaceRolesTable,
      eq(workspaceRoleAssignmentsTable.roleId, workspaceRolesTable.id),
    )
    .where(
      and(
        eq(workspaceRoleAssignmentsTable.workspaceId, workspaceId),
        eq(workspaceRoleAssignmentsTable.assigneeId, userId),
      ),
    )
    .limit(1);

  return workspaceRole[0]?.slug;
}
