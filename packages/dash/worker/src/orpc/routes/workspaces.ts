import { getDbClient } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Storage } from "@core/helpers/storage";
import { usersTable } from "@core/schemas/users.sql";
import { workspaceRoleAssignmentsTable } from "@core/schemas/workspace-role-assignments.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
} from "@shared/workspace/auth";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { assertOrg, assertUser } from "../../helpers/auth";
import { createVisibleError } from "../../helpers/error";
import { createWorkspace } from "../../helpers/workspace";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  WorkspaceIdentifierSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

// ============================================================================
// Input Schemas
// ============================================================================

const listWorkspacesInput = z.object({});

const getWorkspaceInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
});

const createWorkspaceInput = z.object({
  name: z.string().min(1),
});

const updateWorkspaceInput = createWorkspaceInputSchema(
  z
    .object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be at most 50 characters")
        .optional(),
      profilePicture: z
        .object({
          url: z.string().url(),
          key: z.string().min(1),
        })
        .nullable()
        .optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.profilePicture !== undefined,
      {
        message:
          "At least one of name or profilePicture must be provided for update",
        path: [],
      },
    ),
);

const deleteWorkspaceInput = WorkspaceIdentifierSchema.extend({
  workspaceSlug: z.string().min(1),
});

// ============================================================================
// Handlers
// ============================================================================

export const listWorkspaces = orpcBuilder
  .input(listWorkspacesInput)
  .handler(async ({ context }) => {
    const db = getDbClient();
    const honoCtx = context.honoContext;
    const role = honoCtx.get("role");
    const user = assertUser(honoCtx);
    const organizationId = assertOrg(honoCtx);

    // If the user is an admin or owner, they have unrestricted access to all workspaces
    if (role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER) {
      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.organizationId, organizationId));
      return { workspaces };
    }

    // Otherwise, get the workspaces the user has access to
    const workspaces = await db
      .select({
        id: workspacesTable.id,
        name: workspacesTable.name,
        slug: workspacesTable.slug,
        profilePictureUrl: workspacesTable.profilePictureUrl,
        profilePictureKey: workspacesTable.profilePictureKey,
        organizationId: workspacesTable.organizationId,
        createdAt: workspacesTable.createdAt,
        updatedAt: workspacesTable.updatedAt,
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

    return { workspaces };
  });

export const getWorkspace = orpcBuilder
  .input(getWorkspaceInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const db = getDbClient();
    const actor = Actor.assert("workspace_user");
    const { workspaceSlug } = input;

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.slug, workspaceSlug))
      .limit(1);

    if (!workspace) {
      throw createVisibleError(404, {
        message: `Workspace ${workspaceSlug} not found`,
      });
    }

    return {
      workspace: {
        ...workspace,
        actor: {
          userPermissions: actor.properties.workspacePermissions,
          workspaceRole: actor.properties.workspaceRole,
        },
      },
    };
  });

export const createWorkspaceHandler = orpcBuilder
  .input(createWorkspaceInput)
  .handler(async ({ input, context }) => {
    const db = getDbClient();
    const honoCtx = context.honoContext;
    const user = assertUser(honoCtx);
    const organizationId = assertOrg(honoCtx);
    const role = honoCtx.get("role");

    // Check if user has org admin role
    if (role !== ORGANIZATION_ROLE.ADMIN && role !== ORGANIZATION_ROLE.OWNER) {
      throw createVisibleError(403, {
        message: "Only organization admins can create workspaces",
      });
    }

    const { name } = input;
    const workspace = await createWorkspace(db, name, organizationId, user.id);

    return { workspace };
  });

export const updateWorkspace = orpcBuilder
  .input(updateWorkspaceInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const db = getDbClient();
    const actor = Actor.assert("workspace_user");

    // Check workspace permission for settings update
    if (
      !actor.properties.workspacePermissions.includes(
        WORKSPACE_PERMISSION.SETTINGS_UPDATE,
      )
    ) {
      throw createVisibleError(403, {
        message: "You don't have permission to update workspace settings",
      });
    }

    const {
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...payload
    } = input;

    const [existingWorkspace] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(
          eq(workspacesTable.slug, _workspaceSlug ?? ""),
          eq(workspacesTable.id, actor.properties.workspaceID),
        ),
      )
      .limit(1);

    if (!existingWorkspace) {
      throw createVisibleError(404, {
        message: `Workspace ${_workspaceSlug} not found`,
      });
    }

    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      updates.name = payload.name;
    }

    if (payload.profilePicture !== undefined) {
      updates.profilePictureUrl = payload.profilePicture?.url ?? null;
      updates.profilePictureKey = payload.profilePicture?.key ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return {
        workspace: {
          ...existingWorkspace,
          userPermissions: actor.properties.workspacePermissions,
        },
      };
    }

    const previousProfileKey = existingWorkspace.profilePictureKey ?? null;
    const incomingProfileKey =
      payload.profilePicture !== undefined
        ? (payload.profilePicture?.key ?? null)
        : existingWorkspace.profilePictureKey;

    const [updatedWorkspace] = await db
      .update(workspacesTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(workspacesTable.id, existingWorkspace.id))
      .returning();

    if (
      previousProfileKey &&
      previousProfileKey !== incomingProfileKey &&
      previousProfileKey !== updatedWorkspace.profilePictureKey
    ) {
      try {
        await Storage.deleteFile(previousProfileKey, Storage.PUBLIC_BUCKET);
      } catch (error) {
        console.error("Failed to delete previous workspace avatar", {
          error,
          previousProfileKey,
        });
      }
    }

    return {
      workspace: {
        ...updatedWorkspace,
        userPermissions: actor.properties.workspacePermissions,
      },
    };
  });

export const deleteWorkspace = orpcBuilder
  .input(deleteWorkspaceInput)
  .use(withWorkspaceRole, workspaceRoleMappers.admin)
  .handler(async ({ input, context }) => {
    const db = getDbClient();
    const honoCtx = context.honoContext;
    const user = assertUser(honoCtx);
    const { workspaceSlug } = input;

    const [dbUser] = await db
      .select({
        defaultWorkspaceSlug: usersTable.defaultWorkspaceSlug,
      })
      .from(usersTable)
      .where(eq(usersTable.workosId, user.id))
      .limit(1);

    if (dbUser.defaultWorkspaceSlug === workspaceSlug) {
      throw createVisibleError(400, {
        userMessage: "Default workspace cannot be deleted",
        message: "Attempted to delete default workspace",
      });
    }

    const [result] = await db
      .delete(workspacesTable)
      .where(eq(workspacesTable.slug, workspaceSlug))
      .returning();

    return {
      workspaceId: result?.id,
    };
  });

// ============================================================================
// Router Export
// ============================================================================

export const workspacesRouter = orpcBuilder.router({
  list: listWorkspaces,
  get: getWorkspace,
  create: createWorkspaceHandler,
  update: updateWorkspace,
  delete: deleteWorkspace,
});

export type WorkspacesRouterInputs = InferRouterInputs<typeof workspacesRouter>;
export type WorkspacesRouterOutputs = InferRouterOutputs<
  typeof workspacesRouter
>;
