import { EntPendingContentGroup } from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import type { ContentPublishingStatus } from "@core/schemas/content.sql";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { db } from "@openpromo/core/database/db";
import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type * as z from "zod";
import { createVisibleError } from "../../../../../helpers/error";
import { zValidator } from "../../../../../middleware/zod-validator";
import { buildContentItems, createWorkflowsForContents } from "../helpers";
import { ContentCreateData } from "./create-content";

export const contentGroupsRoute = new Hono<ApiEnv>()
  // Read content group api
  .get("/:id", async (c) => {
    const { id } = c.req.param();
    // read group and its contents
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
          eq(pendingContentGroupTable.id, id),
          eq(pendingContentGroupTable.workspaceId, Actor.workspaceID()),
        ),
      );

    if (!results || results.length === 0) {
      throw createVisibleError(404, { message: "Group not found" });
    }

    const group = results[0].pending_content_group;
    if (!group) throw createVisibleError(404, { message: "Group not found" });

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

    return c.json({ contentCreateData: data });
  })
  // Update content group api
  .patch("/:id", zValidator("json", ContentCreateData), async (c) => {
    const { id } = c.req.param();
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

    if (!publishingStatus)
      throw createVisibleError(400, {
        message: "publishingStatus is required",
      });

    // Build content items from placements
    const contentItems = buildContentItems(placements);

    // Get the group entity and update it with new contents
    // Workflow creation runs atomically after transaction commits
    const group = await EntPendingContentGroup.fromID(id);
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
      // Workflow creation callback - runs after transaction commits
      async (contentIds: string[]) => {
        await createWorkflowsForContents(contentIds, actor, c);
      },
    );

    return c.json({ success: true, groupId: id });
  })
  // Publish group
  .post("/:id", async (c) => {
    const { id } = c.req.param();
    const g = await EntPendingContentGroup.fromID(id);
    if (!g.isDraft() || !g.isScheduled()) {
      throw createVisibleError(400, {
        message: "Only draft or scheduled group can be published",
      });
    }
    const contents = await g.getContents();
    contents.forEach(async (ct) => {
      const ins = await c.env.WORKFLOW.get(ct.data.id);
      // TODO: revisit these and ensure we have robust workflow of different
      // scenarios
      const { status, error, output } = await ins.status();
      if (ct.isDraft()) {
        if (status !== "waiting") {
          // we've got a problem, draft content should be waiting for publish_draft event
          console.log({ error, status, output });
        }
        console.log("// content is draft");
        console.log({ status });
        await ins.sendEvent({ type: "publish_draft", payload: {} });
      }
      if (ct.isScheduled()) {
        console.log("// content is scheduled, publish now");
        await ins.sendEvent({ type: "publish_now", payload: {} });
      }
    });
  })
  // Delete content group
  .delete("/:id", async (c) => {
    const { id } = c.req.param();
    const deleted = await EntPendingContentGroup.deleteByID(id);
    return c.json({ success: !!deleted });
  });
