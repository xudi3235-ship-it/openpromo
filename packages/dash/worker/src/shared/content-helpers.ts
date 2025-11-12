import type { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import type { UnifiedContentInsert } from "@core/schemas/content.sql";
import type { Context } from "hono";
import type { ContentCreateData } from "../orpc/routes/content/create-content";

export type ContentItemBase = Pick<
  UnifiedContentInsert,
  "placement" | "placementSpec" | "connectedAccountId"
>;

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

export async function createWorkflowsForContents(
  contentIds: string[],
  actor: Actor.WorkspaceUser,
  context: Context<ApiEnv>,
) {
  const opts = contentIds.map((contentId) => ({
    id: contentId,
    params: {
      actor,
      pendingContentID: contentId,
    },
  }));

  await context.env.WORKFLOW.createBatch(opts);
}
