import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";
import type { MergedContentContainer } from "../shared/types";

const listContentQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(500).default(20),
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
    .enum([
      "createdAt",
      "scheduledDate",
      "impressions",
      "reach",
      "likes",
      "shares",
    ])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]).optional(),
});

export type ListContentQueryParams = z.infer<typeof listContentQuerySchema>;

export const listContentRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", listContentQuerySchema),
  async (c) => {
    const {
      page,
      pageSize,
      publishingStatus,
      fromDate,
      toDate,
      search,
      sortBy,
      sortOrder,
      platform,
    } = c.req.valid("query");

    const wsID = Actor.workspaceID();

    // Build where conditions
    const whereConditions = [eq(unifiedContentTable.workspaceId, wsID)];

    if (publishingStatus) {
      whereConditions.push(
        eq(unifiedContentTable.publishingStatus, publishingStatus),
      );
    }

    // Filter by platform
    if (platform) {
      const placementPrefix: Record<string, string> = {
        FACEBOOK: "FB_",
        INSTAGRAM: "IG_",
        TIKTOK: "TT_",
      };
      const prefix = placementPrefix[platform];
      if (prefix) {
        // Filter by placement that starts with the platform prefix
        whereConditions.push(
          sql`${unifiedContentTable.placement}::text LIKE ${`${prefix}%`}`,
        );
      }
    }

    if (search) {
      const sanitized = search.replace(/[%_]/g, (char) => `\\${char}`);
      const likeTerm = `%${sanitized}%`;
      whereConditions.push(
        sql`(
          (${unifiedContentTable.placementSpec} -> 'postSpec' ->> 'message') ILIKE ${likeTerm} ESCAPE '\\'
          OR (${unifiedContentTable.placementSpec} ->> 'caption') ILIKE ${likeTerm} ESCAPE '\\'
          OR (${pendingContentGroupTable.pendingContentGroupSpec} ->> 'baseMessage') ILIKE ${likeTerm} ESCAPE '\\'
          OR ${unifiedContentTable.id} ILIKE ${likeTerm} ESCAPE '\\'
          OR ${unifiedContentTable.sourceContentId} ILIKE ${likeTerm} ESCAPE '\\'
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
    let orderByColumn:
      | ReturnType<typeof sql>
      | typeof unifiedContentTable.createdAt;

    switch (sortBy) {
      case "scheduledDate":
        orderByColumn = sql`${unifiedContentTable.placementSpec} -> 'schedulingSpec' ->> 'publishAt'`;
        break;
      case "impressions":
        orderByColumn = sql`COALESCE((${unifiedContentTable.metrics} ->> 'impressions')::integer, 0)`;
        break;
      case "reach":
        orderByColumn = sql`COALESCE((${unifiedContentTable.metrics} ->> 'reach')::integer, 0)`;
        break;
      case "likes":
        orderByColumn = sql`COALESCE((${unifiedContentTable.metrics} ->> 'likes')::integer, 0)`;
        break;
      case "shares":
        orderByColumn = sql`COALESCE((${unifiedContentTable.metrics} ->> 'shares')::integer, 0)`;
        break;
      case "createdAt":
      default:
        orderByColumn = unifiedContentTable.createdAt;
        break;
    }

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
  },
);
