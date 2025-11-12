import { EntPendingContentGroup } from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ContentPublishingStatus } from "@core/schemas/content.sql";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { db } from "@openpromo/core/database/db";
import {
  BasePlacementSpec,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import {
  buildContentItems,
  createWorkflowsForContents,
} from "../../../routes/api/workspaces/content/helpers";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const ContentCreateData = z.object({
  base: BasePlacementSpec,
  placements: z
    .object({
      facebookFeed: FBFeedPlacementSpec.array().optional(),
      instagramFeed: IGFeedPlacementSpec.array().optional(),
      tiktokFeed: TikTokFeedPlacementSpec.array().optional(),
    })
    .refine((val) => val.facebookFeed || val.instagramFeed || val.tiktokFeed, {
      message: "At least one placement must be provided.",
    }),
});

const contentGroupIdentifierInput = createWorkspaceInputSchema(
  z.object({
    contentGroupId: z.string().min(1),
  }),
);

const updateContentGroupInput = createWorkspaceInputSchema(
  z.object({
    contentGroupId: z.string().min(1),
    data: ContentCreateData,
  }),
);

// Get content group by ID
export const getContentGroup = orpcBuilder
  .input(contentGroupIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { contentGroupId } = input;

    const results = await db()
      .select()
      .from(pendingContentGroupTable)
      .leftJoin(
        unifiedContentTable,
        eq(
          pendingContentGroupTable.id,
          unifiedContentTable.pendingContentGroupId,
        ),
      )
      .where(
        and(
          eq(pendingContentGroupTable.id, contentGroupId),
          eq(pendingContentGroupTable.workspaceId, Actor.workspaceID()),
        ),
      );

    if (!results || results.length === 0) {
      throw new Error("Content group not found");
    }

    const group = results[0].pending_content_group;
    if (!group) throw new Error("Content group not found");

    // Extract all contents from the results, filtering out null values
    const contents = results
      .map((row) => row.unified_content)
      .filter(
        (content): content is NonNullable<typeof content> => content !== null,
      );

    const groupSpec = group.pendingContentGroupSpec;

    const data: z.infer<typeof ContentCreateData> = {
      base: {
        publishingStatus: group.publishingStatus,
        message: groupSpec?.baseMessage || "",
        attachments: groupSpec?.baseAttachments || [],
        schedulingSpec: groupSpec?.baseSchedulingSpec,
        firstComment: groupSpec?.baseFirstComment,
      },
      placements: {},
    };

    for (const content of contents) {
      const placementSpec = content.placementSpec;
      if (!placementSpec) continue;

      if (content.placement === "FB_FEED") {
        if (!data.placements.facebookFeed) data.placements.facebookFeed = [];
        data.placements.facebookFeed.push(placementSpec as FBFeedPlacementSpec);
      }
      if (content.placement === "IG_FEED") {
        if (!data.placements.instagramFeed) data.placements.instagramFeed = [];
        data.placements.instagramFeed.push(
          placementSpec as IGFeedPlacementSpec,
        );
      }
      if (content.placement === "TT_FEED") {
        if (!data.placements.tiktokFeed) data.placements.tiktokFeed = [];
        data.placements.tiktokFeed.push(
          placementSpec as TikTokFeedPlacementSpec,
        );
      }
    }

    return {
      contentCreateData: data,
    };
  });

// Update content group
export const updateContentGroup = orpcBuilder
  .input(updateContentGroupInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const { contentGroupId, data } = input;
    const { placements, base } = data;
    const { publishingStatus } = base;

    const hasMessage = Boolean(base.message?.trim());
    const hasAttachments =
      Array.isArray(base.attachments) && base.attachments.length > 0;

    if (!hasMessage && !hasAttachments) {
      throw new Error("Add text or attach media to publish.");
    }

    if (!publishingStatus) {
      throw new Error("publishingStatus is required");
    }

    // Build content items from placements
    const contentItems = buildContentItems(placements);
    const actor = Actor.assert("workspace_user");

    // Get the group entity and update it with new contents
    const group = await EntPendingContentGroup.fromID(contentGroupId);

    // Workflow creation callback - runs after transaction commits
    const createWorkflows = async (contentIds: string[]) => {
      await createWorkflowsForContents(contentIds, actor, context.honoContext);
    };

    await group.updateWithContentsAndWorkflows(
      {
        publishingStatus: publishingStatus as ContentPublishingStatus,
        pendingContentGroupSpec: {
          baseMessage: base.message,
          baseAttachments: base.attachments,
          baseSchedulingSpec: base.schedulingSpec,
          baseFirstComment: base.firstComment,
        },
      },
      contentItems.map((item) => ({
        ...item,
        publishingStatus: publishingStatus as ContentPublishingStatus,
      })),
      createWorkflows,
    );

    return {
      success: true,
      groupId: contentGroupId,
    };
  });

// Publish content group
export const publishContentGroup = orpcBuilder
  .input(contentGroupIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const { contentGroupId } = input;
    const g = await EntPendingContentGroup.fromID(contentGroupId);

    if (!g.isDraft() || !g.isScheduled()) {
      throw new Error("Only draft or scheduled group can be published");
    }

    const contents = await g.getContents();
    contents.forEach(async (ct) => {
      const ins = await context.honoContext.env.WORKFLOW.get(ct.data.id);
      const { status, error } = await ins.status();

      if (ct.isDraft()) {
        if (status !== "waiting") {
          console.log({ error, status });
        }
        await ins.sendEvent({ type: "publish_draft", payload: {} });
      }

      if (ct.isScheduled()) {
        await ins.sendEvent({ type: "publish_now", payload: {} });
      }
    });

    return {
      success: true,
    };
  });

// Delete content group
export const deleteContentGroup = orpcBuilder
  .input(contentGroupIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { contentGroupId } = input;
    const deleted = await EntPendingContentGroup.deleteByID(contentGroupId);
    return {
      success: !!deleted,
    };
  });
