import { id, timestamps, ulid } from "@core/helpers/db";
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

// ---------------------------- Content schemas ----------------------------
export const FBPlacement = {
  FB_FEED: "FB_FEED",
  FB_STORY: "FB_STORY",
  FB_REEL: "FB_REEL",
} as const;

export const IGPlacement = {
  IG_FEED: "IG_FEED",
  IG_STORY: "IG_STORY",
  IG_REEL: "IG_REEL",
} as const;

export const TikTokPlacement = {
  TT_FEED: "TT_FEED",
} as const;

export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
  ...TikTokPlacement,
} as const;

export const AllPlacementZod = z.enum([...Object.values(AllPlacement)]);

export type FBPlacement = (typeof FBPlacement)[keyof typeof FBPlacement];
export type IGPlacement = (typeof IGPlacement)[keyof typeof IGPlacement];
export type TikTokPlacement =
  (typeof TikTokPlacement)[keyof typeof TikTokPlacement];
export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

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
 * platform agnostic schemas for contents
 */
export const BaseAttachmentSpec = z.object({
  id: z.string(),
  presignedUrl: z.string().optional().describe("download url"),
  publicUrl: z.string().optional(),
  s3Key: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  file: z
    .instanceof(File)
    .optional()
    .catch(() => undefined),
});

// Photo attachment
export const PhotoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("photo"),
  width: z.number().optional(),
  height: z.number().optional(),
  altText: z.string().optional(),
});

// Video attachment
export const VideoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("video"),
  duration: z.number().optional(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// Union of all attachment types
export const SharedAttachmentSpec = z.discriminatedUnion("type", [
  PhotoAttachmentSpec,
  VideoAttachmentSpec,
]);

export type SharedAttachmentSpec = z.infer<typeof SharedAttachmentSpec>;

export const SchedulingSpec = z.object({
  publishAt: z.coerce.date().optional(),
});
export type SchedulingSpec = z.infer<typeof SchedulingSpec>;
// ------------------------ Base Placement Spec ------------------------
export const BasePlacementSpec = z.object({
  placement: z.enum([...Object.values(AllPlacement)]).optional(),
  publishingStatus: ContentPublishingStatusZod.optional(),
  customized: z
    .boolean()
    .optional()
    .describe("where this spec is customized compared to base"),
  // normalized fields
  message: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  identity: z
    .object({
      connectedAccountID: z.string(),
      metadata: z.record(z.any(), z.any()).optional(),
    })
    .optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  schedulingSpec: SchedulingSpec.optional(),
});

export type BasePlacementSpec = z.infer<typeof BasePlacementSpec>;

// ========================= Facebook =========================

export const postSpec = z.object({
  message: z.string(),
  link: z.string().optional(),
});

// placement specifics specs
export const BaseFBPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(FBPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    fbPageID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});

export const FBFeedPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.FB_FEED),
  postSpec: postSpec,
});
export type FBFeedPlacementSpec = z.infer<typeof FBFeedPlacementSpec>;

// ========================= Instagram =========================
export const BaseIGPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(IGPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    igAccountID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});
export const IGFeedPlacementSpec = BaseIGPlacementSpec.extend({
  placement: z.literal(IGPlacement.IG_FEED),
  caption: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
});
export type IGFeedPlacementSpec = z.infer<typeof IGFeedPlacementSpec>;

// ========================= TikTok =========================
export const BaseTikTokPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(TikTokPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    tiktokUserID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});

export const TikTokFeedPlacementSpec = BaseTikTokPlacementSpec.extend({
  placement: z.literal(TikTokPlacement.TT_FEED),
  caption: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
});
export type TikTokFeedPlacementSpec = z.infer<typeof TikTokFeedPlacementSpec>;
// ========================= Export =========================

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;

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

export const unifiedContentTable = pgTable(
  "unified_content",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    ...connectedAccountId,
    // external content id, for published content / backfilled.
    sourceContentId: text("source_content_id"),
    // declaration of the source platform's spec, json object
    // that defines what a post looks like on src plat.
    // for scheduled contents: the spec will be translated into multiple api calls, kinda like IaC, due to the dependency graph it needs to sort out, e.g. for a carousel IG posts, we need to create videos 1-3 first, then create a media container for these videos, finally we can create a IGMedia.
    // Similarly, for backfilled contents, upstream services should transform to placement spec.
    // this will be source of truth used in publishing, composer, preview, and backfilling.
    placementSpec: jsonb("placement_spec").$type<PlacementSpec>(),
    // internal, where this is going to
    placement: placementPgEnum().notNull(),
    publishingStatus: publishingStatusPgEnum().notNull(),
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
export const UnifiedContentSelect = createSelectSchema(unifiedContentTable, {
  placement: z.enum([...Object.values(AllPlacement)]),
  publishingStatus: z.enum([...Object.values(ContentPublishingStatus)]),
});
