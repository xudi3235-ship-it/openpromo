import { workspacesTable } from "@openpromo/core/schema/workspaces.sql";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono/types";
import { ORGANIZATION_ROLE, type WorkspaceRole } from "../constants/auth";
import { assertOrg, assertUser } from "../helpers/auth";
import { getDbClient } from "../helpers/db";
import { getWorkspaceRole, hasWorkspaceRole } from "../helpers/role";
import type { ApiEnv } from "../types";

/**
 * Middleware to check if the user has the required workspace role
 * @param requiredRole - The required workspace role
 */
export const withWorkspaceRole: (
  requiredRole: WorkspaceRole,
) => MiddlewareHandler = (requiredRole) => async (c: Context<ApiEnv>, next) => {
  const db = getDbClient(c.env.HYPERDRIVE);

  const orgRole = c.get("role");
  const workspaceId = c.req.param("workspaceId");

  // 1. check if user is authenticated and workspace id is provided
  const user = assertUser(c);

  if (!workspaceId) {
    throw new HTTPException(500, {
      message: "Workspace ID is required in the path",
    });
  }

  // 2. check if workspace is part of the user's organization
  const organizationId = assertOrg(c);
  const orgIdOfWorkspace = await db
    .select({ organizationId: workspacesTable.organizationId })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .then((res) => res[0]?.organizationId);

  if (orgIdOfWorkspace !== organizationId) {
    throw new HTTPException(404);
  }

  // 3. check if user has the required role
  if (
    orgRole === ORGANIZATION_ROLE.OWNER ||
    orgRole === ORGANIZATION_ROLE.ADMIN
  ) {
    // org owner or admin has unrestricted access to all workspaces
    return next();
  }

  const workspaceUserRole = await getWorkspaceRole(
    c.env.HYPERDRIVE,
    workspaceId,
    user.id,
  );

  if (!hasWorkspaceRole(workspaceUserRole, requiredRole)) {
    throw new HTTPException(403, {
      message: `Insufficient workspace permissions. User role: ${workspaceUserRole}, Required role: ${requiredRole}.`,
    });
  }

  return next();
};
