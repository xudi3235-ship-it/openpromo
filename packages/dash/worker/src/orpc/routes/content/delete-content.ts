import { db } from "@core/database/db";
import { EntPendingContentGroup } from "@core/domain/content/entity";
import { EntUnifiedContent } from "@core/domain/content/entity/EntUnifiedContent";
import { Actor } from "@core/helpers/actor";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const deleteContentInput = createWorkspaceInputSchema(
  z.object({
    contentId: z.string().min(1),
  }),
);

export const deleteContent = orpcBuilder
  .input(deleteContentInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const content = await EntUnifiedContent.fromID(input.contentId);
    const deleted = await content.delete();
    return {
      success: !!deleted,
    };
  });

const batchDeleteInput = createWorkspaceInputSchema(
  z.object({
    contentIds: z.array(z.string().min(1)).min(1),
  }),
);

export const batchDeleteContent = orpcBuilder
  .input(batchDeleteInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { contentIds: ids } = input;

    const actor = Actor.assert("workspace_user");

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        // Try to find if it's a content group first
        const groups = await db()
          .select({ id: pendingContentGroupTable.id })
          .from(pendingContentGroupTable)
          .where(
            and(
              eq(pendingContentGroupTable.id, id),
              eq(
                pendingContentGroupTable.workspaceId,
                actor.properties.workspaceID,
              ),
            ),
          )
          .limit(1);

        if (groups.length > 0) {
          // It's a group - delete it
          return await EntPendingContentGroup.deleteByID(id);
        }

        // Try to find if it's individual content
        const contents = await db()
          .select({ id: unifiedContentTable.id })
          .from(unifiedContentTable)
          .where(
            and(
              eq(unifiedContentTable.id, id),
              eq(unifiedContentTable.workspaceId, actor.properties.workspaceID),
            ),
          )
          .limit(1);

        if (contents.length > 0) {
          // It's individual content - delete it
          const content = await EntUnifiedContent.fromID(id);
          return content ? await content.delete() : false;
        }

        throw new Error(`Item with ID ${id} not found`);
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.message || "Unknown error");

    return {
      success: failed === 0,
      deleted: successful,
      failed: failed,
      errors: errors,
      total: ids.length,
    };
  });
