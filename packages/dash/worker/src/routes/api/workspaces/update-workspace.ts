import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { Storage } from "@core/helpers/storage";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { WORKSPACE_PERMISSION, WORKSPACE_ROLE } from "@shared/workspace/auth";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../helpers/error";
import { withWorkspacePermission } from "../../../middleware/with-workspace-permission";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";

const updateWorkspaceSchema = z
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
  );

export const updateWorkspaceRoute = new Hono<ApiEnv>().patch(
  "/:workspaceSlug",
  zValidator("param", z.object({ workspaceSlug: z.string() })),
  zValidator("json", updateWorkspaceSchema),
  withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  withWorkspacePermission(WORKSPACE_PERMISSION.SETTINGS_UPDATE),
  async (ctx) => {
    const db = getDbClient();
    const actor = Actor.assert("workspace_user");
    const { workspaceSlug } = ctx.req.valid("param");
    const payload = ctx.req.valid("json");

    const [existingWorkspace] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(
          eq(workspacesTable.slug, workspaceSlug),
          eq(workspacesTable.id, actor.properties.workspaceID),
        ),
      )
      .limit(1);

    if (!existingWorkspace) {
      throw new AppError(404, {
        message: `Workspace ${workspaceSlug} not found`,
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
      return ctx.json({
        ...existingWorkspace,
        userPermissions: actor.properties.workspacePermissions,
      });
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

    return ctx.json({
      ...updatedWorkspace,
      userPermissions: actor.properties.workspacePermissions,
    });
  },
);
