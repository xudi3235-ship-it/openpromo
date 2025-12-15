import { Actor } from "@core/helpers/actor";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { db } from "@openpromo/core/database/db";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import * as z from "zod";
import type { MergedContentContainer } from "../../../shared/content-types";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

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

const listContentInput = createWorkspaceInputSchema(listContentQuerySchema);

export const listContents = orpcBuilder
  .input(listContentInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
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
    } = input;

    const workspaceId = Actor.workspaceID();
    const whereConditions = [eq(unifiedContentTable.workspaceId, workspaceId)];

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

    // Get total count of entities (groups + standalone content)
    // We need to count distinct groups + content without groups
    const totalCountResult = await db()
      .select({
        // Count distinct groups + count of content without groups
        count: sql<number>`
          COUNT(DISTINCT CASE
            WHEN ${unifiedContentTable.pendingContentGroupId} IS NOT NULL
            THEN ${unifiedContentTable.pendingContentGroupId}
          END) +
          COUNT(CASE
            WHEN ${unifiedContentTable.pendingContentGroupId} IS NULL
            THEN 1
          END)
        `.as("count"),
      })
      .from(unifiedContentTable)
      .leftJoin(
        pendingContentGroupTable,
        eq(
          unifiedContentTable.pendingContentGroupId,
          pendingContentGroupTable.id,
        ),
      )
      .where(and(...whereConditions));

    const totalCount = Number(totalCountResult[0]?.count ?? 0);
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
      default:
        orderByColumn = unifiedContentTable.createdAt;
        break;
    }

    // Step 1: Get paginated entity identifiers (group IDs or content IDs for standalone)
    // Use COALESCE to treat group ID as the entity key, or content ID if no group
    const entityKeysQuery = await db()
      .selectDistinct({
        entityKey:
          sql<string>`COALESCE(${unifiedContentTable.pendingContentGroupId}, ${unifiedContentTable.id})`.as(
            "entity_key",
          ),
        // For ordering, use the max/min of the sort column within each entity
        sortValue:
          sortOrder === "desc"
            ? sql`MAX(${orderByColumn})`.as("sort_value")
            : sql`MIN(${orderByColumn})`.as("sort_value"),
      })
      .from(unifiedContentTable)
      .leftJoin(
        pendingContentGroupTable,
        eq(
          unifiedContentTable.pendingContentGroupId,
          pendingContentGroupTable.id,
        ),
      )
      .where(and(...whereConditions))
      .groupBy(
        sql`COALESCE(${unifiedContentTable.pendingContentGroupId}, ${unifiedContentTable.id})`,
      )
      .orderBy(
        sortOrder === "desc" ? desc(sql`sort_value`) : asc(sql`sort_value`),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const entityKeys = entityKeysQuery.map((r) => r.entityKey);

    if (entityKeys.length === 0) {
      return {
        entities: [],
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }

    // Step 2: Fetch all content for the selected entities
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
      .where(
        and(
          ...whereConditions,
          sql`COALESCE(${unifiedContentTable.pendingContentGroupId}, ${unifiedContentTable.id}) IN (${sql.join(
            entityKeys.map((k) => sql`${k}`),
            sql`, `,
          )})`,
        ),
      )
      .orderBy(orderByFn(orderByColumn));

    // Step 3: Group by pendingContentGroupId, maintaining entity order
    const entityMap = new Map<string, z.infer<typeof MergedContentContainer>>();

    for (const row of raw) {
      const { unified_content, pending_content_group } = row;
      const entityKey = pending_content_group?.id ?? unified_content.id;

      if (pending_content_group) {
        let existingGroup = entityMap.get(entityKey);
        if (!existingGroup) {
          existingGroup = {
            type: "group",
            entity: pending_content_group,
            contents: [],
          };
          entityMap.set(entityKey, existingGroup);
        }
        if (existingGroup.type === "group") {
          existingGroup.contents.push(unified_content);
        }
      } else {
        entityMap.set(entityKey, {
          type: "content",
          entity: unified_content,
        });
      }
    }

    // Maintain the order from entityKeys
    const entities = entityKeys
      .map((key) => entityMap.get(key))
      .filter(
        (e): e is z.infer<typeof MergedContentContainer> => e !== undefined,
      );

    return {
      entities,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });
