import { id, timestamps, ulid } from "@core/helpers/db";
import type { PlacementSpec as PlacementSpecType } from "@shared/content";
import {
  AllPlacement,
  ContentPublishingStatus,
  PlacementSpec,
  SchedulingSpec,
  SharedAttachmentSpec,
} from "@shared/content";
import type { BuildExtraConfigColumns } from "drizzle-orm";
import {
  jsonb,
  type PgColumnBuilder,
  type PgTableExtraConfigValue,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as z from "zod";
import { connectedAccountId } from "./connected-account.sql";
import { workspaceID } from "./workspaces.sql";

export * from "@shared/content";

// ----- enums -----
export const publishingStatusPgEnum = pgEnum(
  "publishing_status",
  ContentPublishingStatus,
);
export const placementPgEnum = pgEnum("placement", AllPlacement);

// trying to get a table builder so that it enforces
// workspace scoping. and extracts common table columns.
export const _notReadyYet = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilder>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildExtraConfigColumns<TTableName, TColumnsMap, "pg">,
  ) => PgTableExtraConfigValue[],
) => {
  return pgTable(
    name,
    {
      ...id,
      ...workspaceID,
      ...timestamps,
      ...columns,
    },
    (self) => {
      const baseExtraConfig: PgTableExtraConfigValue[] = [];
      if (extraConfig) {
        const fullyTypedSelf = self as BuildExtraConfigColumns<
          TTableName,
          TColumnsMap,
          "pg"
        >;
        return [...baseExtraConfig, ...extraConfig(fullyTypedSelf)];
      }
      return baseExtraConfig;
    },
  );
};

/**
 * Spec for pending content groups.
 * Contains base content data that serves as the source of truth for the group.
 * Individual placements can customize from this base.
 */
const pendingContentGroupSpec = z.object({
  // Base content data - source of truth for the group
  baseMessage: z.string().optional(),
  baseAttachments: SharedAttachmentSpec.array().optional(),
  baseSchedulingSpec: SchedulingSpec.optional(),
});

type PendingContentGroupSpec = z.infer<typeof pendingContentGroupSpec>;

const posInt = z.number().int().nonnegative();

const unifiedContentMetricsSchema = z.object({
  impressions: posInt.optional(),
  reach: posInt.optional(),
  engagement: posInt.optional(),
  clicks: posInt.optional(),
  likes: posInt.optional(),
  comments: posInt.optional(),
  shares: posInt.optional(),
});

export type UnifiedContentMetrics = z.infer<typeof unifiedContentMetricsSchema>;

/**
 * Heart of data model supporting scheduling, drafts
 * handling draft & scheduling, 1..N to unified content.
 */
export const pendingContentGroupTable = pgTable(
  "pending_content_group",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    publishingStatus: publishingStatusPgEnum().notNull(),
    pendingContentGroupSpec: jsonb(
      "pending_content_group_spec",
    ).$type<PendingContentGroupSpec>(),
  },
  (t) => [uniqueIndex().on(t.workspaceId, t.id)],
);

const groupOpts = {
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
};

export const PendingContentGroupInsert = createInsertSchema(
  pendingContentGroupTable,
  groupOpts,
);
export const PendingContentGroupUpdate = createUpdateSchema(
  pendingContentGroupTable,
  groupOpts,
);
export const PendingContentGroupSelect = createSelectSchema(
  pendingContentGroupTable,
  groupOpts,
);

export type PendingContentGroupInsert = z.infer<
  typeof PendingContentGroupInsert
>;
export type PendingContentGroupUpdate = z.infer<
  typeof PendingContentGroupUpdate
>;
export type PendingContentGroupSelect = z.infer<
  typeof PendingContentGroupSelect
>;

/**
 * core data model that represents a piece of content x-plat.
 * For scheduled/draft contents, it's linked to a pending_content_group.
 * Else, it's a published content on the source platform, probably synced / backfilled.
 *
 * We designed this in a unified way to handle scheduling and backfilling. For scheduled contents, the placement_spec is a json objects stored all the params.
 *
 * For backfilled contents, upstream services should transform to placement spec.
 */

export const unifiedContentTable = pgTable(
  "unified_content",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    ...connectedAccountId, // TODO: enforce connected account scoping
    // external content id, for published content / backfilled.
    sourceContentId: text("source_content_id").unique(),
    permalinkUrl: text("permalink_url"),
    // declaration of the source platform's spec, json object
    // that defines what a post looks like on src plat.
    // for scheduled contents: the spec will be translated into multiple api calls, kinda like IaC, due to the dependency graph it needs to sort out, e.g. for a carousel IG posts, we need to create videos 1-3 first, then create a media container for these videos, finally we can create a IGMedia.
    // Similarly, for backfilled contents, upstream services should transform to placement spec.
    // this will be source of truth used in publishing, composer, preview, and backfilling.
    placementSpec: jsonb("placement_spec").$type<PlacementSpecType>().notNull(),
    // internal, where this is going to
    placement: placementPgEnum().notNull(),
    publishingStatus: publishingStatusPgEnum().notNull(),
    pendingContentGroupId: ulid("pending_content_group_id").references(
      () => pendingContentGroupTable.id,
    ),
    metrics: jsonb("metrics")
      .$type<UnifiedContentMetrics>()
      .notNull()
      .default({}),
  },
  // TODO: we prob need more index to speed up get by queries.
  (t) => [uniqueIndex().on(t.id, t.workspaceId, t.connectedAccountId)],
);

const opts = {
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
  placement: z.enum([...Object.values(AllPlacement)]),
  metrics: unifiedContentMetricsSchema.optional(),
  placementSpec: PlacementSpec,
};
export const UnifiedContentInsert = createInsertSchema(
  unifiedContentTable,
  opts,
);
export const UnifiedContentUpdate = createUpdateSchema(
  unifiedContentTable,
  opts,
);
export const UnifiedContentSelect = createSelectSchema(
  unifiedContentTable,
  opts,
);

export type UnifiedContentInsert = z.infer<typeof UnifiedContentInsert>;
export type UnifiedContentUpdate = z.infer<typeof UnifiedContentUpdate>;
export type UnifiedContentSelect = z.infer<typeof UnifiedContentSelect>;

export type UnifiedContentForPlacement<T extends AllPlacement[number]> = {
  [K in keyof UnifiedContentSelect]: K extends "placement"
    ? T
    : K extends "placementSpec"
      ? Extract<PlacementSpecType, { placement: T }>
      : UnifiedContentSelect[K];
};
export type UnifiedContentFacebookPost = UnifiedContentForPlacement<"FB_FEED">;
export type UnifiedContentInstagramPost = UnifiedContentForPlacement<"IG_FEED">;
export type UnifiedContentTikTokPost = UnifiedContentForPlacement<"TT_FEED">;
