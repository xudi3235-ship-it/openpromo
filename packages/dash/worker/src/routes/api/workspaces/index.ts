import {
  ORGANIZATION_ROLE,
  WORKSPACE_ROLE,
} from "@openpromo/core/domain/workspace/auth";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { getDbClient } from "@openpromo/core/helpers/db/index";
import { usersTable } from "@openpromo/core/schemas/users.sql";
import { workspaceRoleAssignmentsTable } from "@openpromo/core/schemas/workspace-role-assignments.sql";
import { workspacesTable } from "@openpromo/core/schemas/workspaces.sql";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { assertOrg, assertUser } from "../../../helpers/auth";
import { AppError } from "../../../helpers/error";
import { createWorkspace } from "../../../helpers/workspace";
import { withAuth } from "../../../middleware/with-auth";
import { withOrgRole } from "../../../middleware/with-org-role";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";
import { connectedAccountsRoute } from "./connected-accounts";
import { contentRoute } from "./content";
import { mediaRoute } from "./media";

export const workspacesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  // List all workspaces a user has access to
  .get("/", async (ctx) => {
    const db = getDbClient();
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
      .select({
        id: workspacesTable.id,
        name: workspacesTable.name,
        slug: workspacesTable.slug,
      })
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
      );

    return ctx.json(workspaces);
  })
  // Get workspace by slug
  .get(
    "/:workspaceSlug",
    zValidator("param", z.object({ workspaceSlug: z.string() })),
    withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
    async (ctx) => {
      const db = getDbClient();

      const { workspaceSlug } = ctx.req.valid("param");

      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.slug, workspaceSlug))
        .limit(1);

      if (!workspace) {
        throw new AppError(404, {
          message: `Workspace ${workspaceSlug} not found`,
        });
      }
      return ctx.json(workspace);
    },
  )
  // Create a new workspace
  .post(
    "/",
    zValidator("json", z.object({ name: z.string() })),
    withOrgRole(ORGANIZATION_ROLE.ADMIN),
    async (ctx) => {
      const db = getDbClient();

      const user = assertUser(ctx);
      const organizationId = assertOrg(ctx);
      const { name } = ctx.req.valid("json");

      const workspace = await createWorkspace(
        db,
        name,
        organizationId,
        user.id,
      );

      return ctx.json(workspace);
    },
  )
  // Delete workspace by slug
  .delete(
    "/:workspaceSlug",
    zValidator("param", z.object({ workspaceSlug: z.string() })),
    withWorkspaceRole(WORKSPACE_ROLE.ADMIN),
    async (ctx) => {
      const db = getDbClient();

      const user = assertUser(ctx);
      const { workspaceSlug } = ctx.req.valid("param");

      const [dbUser] = await db
        .select({
          defaultWorkspaceSlug: usersTable.defaultWorkspaceSlug,
        })
        .from(usersTable)
        .where(eq(usersTable.workosId, user.id))
        .limit(1);

      if (dbUser.defaultWorkspaceSlug === workspaceSlug) {
        throw new AppError(400, {
          userMessage: "Default workspace cannot be deleted",
        });
      }

      const [result] = await db
        .delete(workspacesTable)
        .where(eq(workspacesTable.slug, workspaceSlug))
        .returning();

      return ctx.json({ workspaceId: result?.id });
    },
  )
  .route("/:workspaceSlug/connected_accounts", connectedAccountsRoute)
  .route("/:workspaceSlug/media", mediaRoute)
  .route("/:workspaceSlug/content", contentRoute);
