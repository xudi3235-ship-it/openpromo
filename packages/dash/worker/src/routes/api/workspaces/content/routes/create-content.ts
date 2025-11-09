import {
  EntPendingContent,
  EntPendingContentGroup,
} from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import type { ContentPublishingStatus } from "@core/schemas/content.sql";
import {
  BasePlacementSpec,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { Hono } from "hono";
import * as z from "zod";
import { createVisibleError } from "../../../../../helpers/error";
import { zValidator } from "../../../../../middleware/zod-validator";
import { buildContentItems, createWorkflowsForContents } from "../helpers";

export const ContentCreateData = z.object({
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

export type ContentCreateData = z.infer<typeof ContentCreateData>;

export const createContentRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", ContentCreateData),
  async (c) => {
    const actor = Actor.assert("workspace_user");
    const { placements, base } = c.req.valid("json");
    const { publishingStatus } = base;

    const hasMessage = Boolean(base.message?.trim());
    const hasAttachments =
      Array.isArray(base.attachments) && base.attachments.length > 0;

    if (!hasMessage && !hasAttachments) {
      throw createVisibleError(400, {
        message: "Add text or attach media to publish.",
      });
    }

    const contentItems = buildContentItems(placements);

    let groupId: string | undefined;

    // Workflow creation callback - runs after transaction commits
    const createWorkflows = async (contentIds: string[]) => {
      await createWorkflowsForContents(contentIds, actor, c);
    };

    // Create group with contents for DRAFT and SCHEDULED
    if (publishingStatus === "DRAFT" || publishingStatus === "SCHEDULED") {
      const { pendingContentGroup } =
        await EntPendingContentGroup.createWithWorkflows(
          {
            group: {
              publishingStatus,
              pendingContentGroupSpec: {
                baseMessage: base.message,
                baseAttachments: base.attachments,
                baseSchedulingSpec: base.schedulingSpec,
                baseFirstComment: base.firstComment,
              },
            },
            contents: contentItems.map((item) => ({
              ...item,
              publishingStatus: publishingStatus as ContentPublishingStatus,
            })),
          },
          createWorkflows, // Workflow creation runs after transaction commits
        );
      groupId = pendingContentGroup.id;
    } else {
      // For PUBLISH_NOW, create contents directly without group
      await EntPendingContent.createManyWithWorkflows(
        contentItems.map((item) => ({
          ...item,
          publishingStatus: publishingStatus as ContentPublishingStatus,
          pendingContentGroupId: null,
        })),
        createWorkflows, // Workflow creation runs after transaction commits
      );
    }

    return c.json({ success: true, groupId });
  },
);
