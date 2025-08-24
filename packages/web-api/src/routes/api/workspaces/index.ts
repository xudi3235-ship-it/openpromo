import { zValidator } from "@hono/zod-validator";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/schema/workspace_role_assignments.sql";
import { workspacesTable } from "@openpromo/core/schema/workspaces.sql";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ORGANIZATION_ROLE, WORKSPACE_ROLE } from "../../../constants/auth";
import { assertOrg, assertUser } from "../../../helpers/auth";
import { getDbClient } from "../../../helpers/db";
import { AppError } from "../../../helpers/error";
import { withAuth } from "../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import type { ApiEnv } from "../../../types";

export const workspacesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/", async (ctx) => {
    const db = getDbClient(ctx.env.HYPERDRIVE);
    const role = ctx.get("role");
    const user = assertUser(ctx);
    const organizationId = assertOrg(ctx);

    // if the user is an admin or owner, they have unrestricted access to all workspaces in the organization
    if (role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER) {
      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.organizationId, organizationId));
      return ctx.json(workspaces);
    }

    // Otherwise, get the workspaces the user has access to
    const workspaces = await db
      .select()
      .from(workspacesTable)
      .innerJoin(
        workspaceRoleAssignmentsTable,
        eq(workspacesTable.id, workspaceRoleAssignmentsTable.workspaceId),
      )
      .where(
        and(
          eq(workspaceRoleAssignmentsTable.assigneeId, user.id),
          eq(workspacesTable.organizationId, organizationId),
        ),
      )
      .then((res) => res.map((w) => w.workspaces));

    return ctx.json(workspaces);
  })
  .get(
    "/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
    async (ctx) => {
      const db = getDbClient(ctx.env.HYPERDRIVE);

      const { workspaceId } = ctx.req.valid("param");

      const workspace = await db
        .select()
        .from(workspacesTable)
        .where(and(eq(workspacesTable.id, workspaceId)))
        .then((res) => res[0]);

      if (!workspace) {
        throw new AppError(404, {
          message: `Workspace ${workspaceId} not found`,
        });
      }
      return ctx.json(workspace);
    },
  );
