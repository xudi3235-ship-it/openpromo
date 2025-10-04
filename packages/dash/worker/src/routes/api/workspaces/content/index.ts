import { EntUnifiedContent } from "@core/domain/content/entity/base";
import {
  EntPendingContent,
  EntPendingContentGroup,
} from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import {
  type ContentPublishingStatus,
  PendingContentGroupSelect,
  pendingContentGroupTable,
  UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import {
  BasePlacementSpec,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../helpers/error";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";
import { buildContentItems, createWorkflowsForContents } from "./helpers";

const listContentQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(20),
  publishingStatus: z
    .enum([
      "DRAFT",
      "SCHEDULED",
      "PUBLISHED",
      "FAILED_TO_PUBLISH",
      "PUBLISH_NOW",
    ])
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  search: z.string().min(1).max(200).optional(),
  sortBy: z
    .enum(["createdAt", "scheduledDate"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const GroupEntity = z.object({
  type: z.literal("group"),
  entity: PendingContentGroupSelect,
  contents: UnifiedContentSelect.array(),
});
const ContentEntity = z.object({
  type: z.literal("content"),
  entity: UnifiedContentSelect,
});
export type GroupEntity = z.infer<typeof GroupEntity>;
export type ContentEntity = z.infer<typeof ContentEntity>;
const MergedContentContainer = z.discriminatedUnion("type", [
  ContentEntity,
  GroupEntity,
]);
export type MergedContentEntity = z.infer<typeof MergedContentContainer>;

export type MergedContentContainer = z.infer<typeof MergedContentContainer>;

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

const BatchDeleteRequestSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
  type: z.enum(["content", "group", "mixed"]).optional().default("mixed"),
});

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  // batch delete content/groups api
  .delete("/batch", zValidator("json", BatchDeleteRequestSchema), async (c) => {
    const { ids } = c.req.valid("json");
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

    return c.json({
      success: failed === 0,
      deleted: successful,
      failed: failed,
      errors: errors,
      total: ids.length,
    });
  })
  // list content api
  .get("/", zValidator("query", listContentQuerySchema), async (c) => {
    const {
      page,
      pageSize,
      publishingStatus,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
    } = c.req.valid("query");
    // await createDummyPendingContent();
    const wsID = Actor.workspaceID();

    // Build where conditions
    const whereConditions = [eq(unifiedContentTable.workspaceId, wsID)];

    if (publishingStatus) {
      whereConditions.push(
        eq(unifiedContentTable.publishingStatus, publishingStatus),
      );
    }

    if (search) {
      const sanitized = search.replace(/[%_]/g, (char) => `\\${char}`);
      const likeTerm = `%${sanitized}%`;
      whereConditions.push(
        sql`(
          (${unifiedContentTable.placementSpec} -> 'postSpec' ->> 'message') ILIKE ${likeTerm} ESCAPE '\\'
          OR (${unifiedContentTable.placementSpec} ->> 'caption') ILIKE ${likeTerm} ESCAPE '\\'
          OR (${pendingContentGroupTable.pendingContentGroupSpec} ->> 'baseMessage') ILIKE ${likeTerm} ESCAPE '\\'
        )`,
      );
    }

    if (fromDate) {
      whereConditions.push(gte(unifiedContentTable.createdAt, fromDate));
    }

    if (toDate) {
      whereConditions.push(lte(unifiedContentTable.createdAt, toDate));
    }

    // Get total count with filters
    const totalCountResult = await db()
      .select({ count: count() })
      .from(unifiedContentTable)
      .leftJoin(
        pendingContentGroupTable,
        eq(
          unifiedContentTable.pendingContentGroupId,
          pendingContentGroupTable.id,
        ),
      )
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Determine order by clause based on sortBy and sortOrder
    const orderByFn = sortOrder === "asc" ? asc : desc;
    const orderByColumn =
      sortBy === "scheduledDate"
        ? sql`${unifiedContentTable.placementSpec} -> 'schedulingSpec' ->> 'publishAt'`
        : unifiedContentTable.createdAt;

    const raw = await db()
      .select()
      .from(unifiedContentTable)
      .leftJoin(
        pendingContentGroupTable,
        eq(
          unifiedContentTable.pendingContentGroupId,
          pendingContentGroupTable.id,
        ),
      )
      .where(and(...whereConditions))
      .orderBy(orderByFn(orderByColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Process and group by pendingContentGroupId
    const entities = raw.reduce<z.infer<typeof MergedContentContainer>[]>(
      (acc, row) => {
        const { unified_content, pending_content_group } = row;

        if (pending_content_group) {
          // Content belongs to a group - find existing group or create new one
          let existingGroup = acc.find(
            (entity) =>
              entity.type === "group" &&
              entity.entity.id === pending_content_group.id,
          );

          if (!existingGroup) {
            existingGroup = {
              type: "group",
              entity: pending_content_group,
              contents: [],
            };
            acc.push(existingGroup);
          }

          if (existingGroup.type === "group") {
            existingGroup.contents.push(unified_content);
          }
        } else {
          // Individual content (no group)
          acc.push({
            type: "content",
            entity: unified_content,
          });
        }

        return acc;
      },
      [],
    );

    return c.json({
      entities,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  })
  // update content group api
  .patch("/group/:id", zValidator("json", ContentCreateData), async (c) => {
    const { id } = c.req.param();
    const actor = Actor.assert("workspace_user");
    const { placements, base } = c.req.valid("json");
    const { publishingStatus } = base;

    if (!publishingStatus)
      throw new AppError(400, { message: "publishingStatus is required" });

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
  // create content api
  .post("/create", zValidator("json", ContentCreateData), async (c) => {
    const actor = Actor.assert("workspace_user");
    const { placements, base } = c.req.valid("json");
    const { publishingStatus } = base;

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
  })
  // read content group api
  .get("/group/:id", async (c) => {
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
      throw new AppError(404, { message: "Group not found" });
    }

    const group = results[0].pending_content_group;
    if (!group) throw new AppError(404, { message: "Group not found" });

    // Extract all contents from the results, filtering out null values
    const contents = results
      .map((row) => row.unified_content)
      .filter(
        (content): content is NonNullable<typeof content> => content !== null,
      );

    const groupSpec = group.pendingContentGroupSpec;

    const data: ContentCreateData = {
      base: {
        publishingStatus: group.publishingStatus,
        message: groupSpec?.baseMessage || "",
        attachments: groupSpec?.baseAttachments || [],
        schedulingSpec: groupSpec?.baseSchedulingSpec,
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
  .delete("/group/:id", async (c) => {
    const { id } = c.req.param();
    const deleted = await EntPendingContentGroup.deleteByID(id);
    return c.json({ success: !!deleted });
  })
  // publish
  .post("/group/:id", async (c) => {
    const { id } = c.req.param();
    const g = await EntPendingContentGroup.fromID(id);
    if (!g.isDraft() || !g.isScheduled()) {
      throw new AppError(400, {
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
  .delete("/content/:id", async (c) => {
    const { id } = c.req.param();
    const content = await EntUnifiedContent.fromID(id);
    if (!content)
      throw new AppError(404, { message: `Content ${id} not found` });
    const deleted = await content.delete();
    return c.json({ success: !!deleted });
  })
  .post(
    "/backfill",
    zValidator(
      "json",
      z.object({
        connectedAccountID: z.string(),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
      }),
    ),
    async (c) => {
      // starts workflow for backfilling content
      // it will create unified content entries
      // from source platform
      const payload = c.req.valid("json");
      const actor = Actor.assert("workspace_user");
      const instance = await c.env.ContentBackfillWorkflow.create({
        params: {
          actor,
          ...payload,
        },
      });
      return c.json({ id: instance.id, status: await instance.status() });
    },
  );
