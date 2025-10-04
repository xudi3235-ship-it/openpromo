import { EntPendingContent } from "@core/domain/content/entity/index";
import type { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { afterTx } from "@core/helpers/db/transaction";
import type {
  ContentPublishingStatus,
  UnifiedContentInsert,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import type { Context } from "hono";
import type { ContentCreateData } from "./index";

/**
 * Type for intermediate content item - just the fields we extract from placements.
 * These will be combined with publishingStatus and groupId to create full UnifiedContentInsert.
 */
export type ContentItemBase = Pick<
  UnifiedContentInsert,
  "placement" | "placementSpec" | "connectedAccountId"
>;

/**
 * Builds an array of content items from placement specifications
 */
export function buildContentItems(
  placements: ContentCreateData["placements"],
): ContentItemBase[] {
  const contentItems: ContentItemBase[] = [];

  if (placements.facebookFeed) {
    contentItems.push(
      ...placements.facebookFeed.map((spec) => ({
        placement: "FB_FEED" as const,
        placementSpec: spec,
        connectedAccountId: spec.identity.connectedAccountID,
      })),
    );
  }

  if (placements.instagramFeed) {
    contentItems.push(
      ...placements.instagramFeed.map((spec) => ({
        placement: "IG_FEED" as const,
        placementSpec: spec,
        connectedAccountId: spec.identity.connectedAccountID,
      })),
    );
  }

  if (placements.tiktokFeed) {
    contentItems.push(
      ...placements.tiktokFeed.map((spec) => ({
        placement: "TT_FEED" as const,
        placementSpec: spec,
        connectedAccountId: spec.identity.connectedAccountID,
      })),
    );
  }

  return contentItems;
}

/**
 * Converts content items to database insert values.
 * Takes the base content items and combines them with the required context fields.
 */
export function contentItemsToInsertValues(
  contentItems: ContentItemBase[],
  workspaceId: string,
  publishingStatus: ContentPublishingStatus,
  groupId: string | null,
): Omit<UnifiedContentInsert, "id" | "createdAt" | "updatedAt">[] {
  return contentItems.map((item) => ({
    ...item,
    workspaceId,
    pendingContentGroupId: groupId,
    publishingStatus,
  }));
}

/**
 * Initializes attachment metadata and creates workflows for inserted contents
 */
export async function initializeContentsAndWorkflows(
  insertedContents: UnifiedContentSelect[],
  actor: Actor.WorkspaceUser,
  context: Context<ApiEnv>,
) {
  await Promise.all(
    insertedContents.map(async (content) => {
      // Initialize attachment metadata
      const pending = new EntPendingContent(content);
      await pending.initializeAttachmentMetadata();

      // Create workflow for each content
      try {
        await context.env.WORKFLOW.create({
          id: content.id,
          params: {
            actor,
            pendingContentID: content.id,
          },
        });
      } catch (e) {
        console.error(
          `Failed to create workflow for content ${content.id}:`,
          e,
        );
        // Don't throw - content is already created
      }
    }),
  );
}

/**
 * Terminates workflows for given content IDs
 */
export async function terminateWorkflows(contentIds: string[]) {
  await Promise.allSettled(
    contentIds.map((id) => EntPendingContent.killWorkflow(id)),
  );
}

/**
 * Handles post-transaction workflow management for content updates
 */
export async function handleContentUpdateWorkflows(
  existingContentIds: string[],
  insertedContents: UnifiedContentSelect[],
  actor: Actor.WorkspaceUser,
  context: Context<ApiEnv>,
) {
  await afterTx(async () => {
    // Terminate old workflows
    await terminateWorkflows(existingContentIds);

    // Initialize metadata and create new workflows
    await initializeContentsAndWorkflows(insertedContents, actor, context);
  });
}

/**
 * Handles post-transaction workflow creation for new content
 */
export async function handleContentCreationWorkflows(
  insertedContents: UnifiedContentSelect[],
  actor: Actor.WorkspaceUser,
  context: Context<ApiEnv>,
) {
  await afterTx(async () => {
    await initializeContentsAndWorkflows(insertedContents, actor, context);
  });
}
