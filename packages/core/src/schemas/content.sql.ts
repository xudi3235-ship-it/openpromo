import {
  AllPlacement,
  type PlacementSpec,
} from "@core/domain/content/schema/placement";
import { id, timestamps, ulid } from "@core/helpers/db";
import type { BuildExtraConfigColumns } from "drizzle-orm";
import {
  jsonb,
  type PgColumnBuilder,
  type PgTableExtraConfigValue,
  pgEnum,
  pgTable,
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

export const ContentPublishingStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED_TO_PUBLISH: "FAILED_TO_PUBLISH",
  PUBLISH_NOW: "PUBLISH_NOW",
} as const;

export type ContentPublishingStatus =
  (typeof ContentPublishingStatus)[keyof typeof ContentPublishingStatus];

export const ContentPublishingStatusZod = z.enum([
  ...Object.values(ContentPublishingStatus),
]);
// ----- enums -----
export const publishingStatusPgEnum = pgEnum(
  "publishing_status",
  ContentPublishingStatus,
);
export const placementPgEnum = pgEnum("placement", AllPlacement);

/**
 * specs for pending content group, a logical grouping of contents for scheduled or drafts. For such use case, this provides a unified config for different features.
 * Later it might include features like multi-user approval workflows, comments, etc.
 *
 */
const pendingContentGroupSpec = z.object({});

type PendingContentGroupSpec = z.infer<typeof pendingContentGroupSpec>;

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

const pendingContentGroupRefinements = {
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
};

export const PendingContentGroupInsert = createInsertSchema(
  pendingContentGroupTable,
  pendingContentGroupRefinements,
);
export const PendingContentGroupUpdate = createUpdateSchema(
  pendingContentGroupTable,
  pendingContentGroupRefinements,
);
export const PendingContentGroupSelect = createSelectSchema(
  pendingContentGroupTable,
  pendingContentGroupRefinements,
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

// scheduling spec is bound at the content level.
const SchedulingSpec = z.object({
  scheduledPublishAt: z.date(),
});

type SchedulingSpec = z.infer<typeof SchedulingSpec>;

export const unifiedContentTable = pgTable(
  "unified_content",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    ...connectedAccountId,
    // external content id, for published content / backfilled.
    sourceContentId: ulid("source_content_id"),
    // declaration of the source platform's spec, json object
    // that defines what a post looks like on src plat.
    // for scheduled contents: the spec will be translated into multiple api calls, kinda like IaC, due to the dependency graph it needs to sort out, e.g. for a carousel IG posts, we need to create videos 1-3 first, then create a media container for these videos, finally we can create a IGMedia.
    // Similarly, for backfilled contents, upstream services should transform to placement spec.
    // this will be source of truth used in publishing, composer, preview, and backfilling.
    placementSpec: jsonb("placement_spec").$type<PlacementSpec>(),
    // internal, where this is going to
    placement: placementPgEnum().notNull(),
    publishingStatus: publishingStatusPgEnum().notNull(),
    // scheduling spec
    schedulingSpec: jsonb("scheduling_spec").$type<SchedulingSpec>(),
    // this is optional, for cascading deletions, app-layer handles it
    pendingContentGroupId: ulid("pending_content_group_id").references(
      () => pendingContentGroupTable.id,
    ),
  },
  (t) => [uniqueIndex().on(t.id, t.workspaceId, t.connectedAccountId)],
);

export type UnifiedContentSelect = typeof unifiedContentTable.$inferSelect;
export type UnifiedContentInsert = typeof unifiedContentTable.$inferInsert;
export type UnifiedContentForPlacement<T extends AllPlacement[number]> = {
  [K in keyof UnifiedContentSelect]: K extends "placement"
    ? T
    : K extends "placementSpec"
      ? Extract<PlacementSpec, { placement: T }>
      : UnifiedContentSelect[K];
};
export type UnifiedContentFacebookPost = UnifiedContentForPlacement<"FB_FEED">;
export type UnifiedContentInstagramPost = UnifiedContentForPlacement<"IG_FEED">;

export const UnifiedContentInsert = createInsertSchema(unifiedContentTable, {
  placement: z.enum([...Object.values(AllPlacement)]),
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
});
export const UnifiedContentUpdate = createUpdateSchema(unifiedContentTable, {
  placement: z.enum([...Object.values(AllPlacement)]),
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
});
