import { EntPendingContent } from "@core/domain/content/entity/index";
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
    const content = await EntPendingContent.fromID(input.contentId);
    await content._delete();
    return {
      success: true,
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
    const { contentIds } = input;

    // Delete contents in parallel
    await Promise.all(
      contentIds.map(async (contentId) => {
        try {
          const content = await EntPendingContent.fromID(contentId);
          await content._delete();
        } catch (error) {
          // Log error but continue with other deletions
          console.error(`Failed to delete content ${contentId}:`, error);
        }
      }),
    );

    return {
      success: true,
      deletedCount: contentIds.length,
    };
  });
