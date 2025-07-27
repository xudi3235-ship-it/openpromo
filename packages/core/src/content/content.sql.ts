import {
  foreignKey,
  json,
  MySqlColumnBuilder,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { timestamps, ulid, timestamp } from "../drizzle/types";
import z from "zod";
import { workspaceID, workspaceIndexes } from "../workspace/workspace.sql";
import { createSelectSchema } from "drizzle-zod";

const baseContentTable = <
  TTableName extends string,
  TColumnsMap extends Record<string, MySqlColumnBuilder>,
>(
  name: TTableName,
  columns: TColumnsMap,
) => {
  return mysqlTable(name, {
    ...workspaceID,
    ...timestamps,
    ...columns,
  });
};

// a piece of attachment, could be img, video, etc
const AttachmentSpec = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  s3Key: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});

export const TimeSpec = z.object({
  createdAt: z.string().optional(),
  scheduledPublishAt: z.date().optional(),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
// internal content spec.
// platform agnostic representation of a "post" item.
export const ContentBaseSpec = z.object({
  title: z.string().optional(),
  bodyText: z.string().optional(),
  attachments: z.array(AttachmentSpec).optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  timeSpec: TimeSpec.optional(),
});

type ContentBaseSpec = z.infer<typeof ContentBaseSpec>;

// handling draft & scheduling, 1..N to unified content
export const pendingContentGroupTable = mysqlTable(
  "pending_content_group",
  {
    ...workspaceID,
    ...timestamps,
    baseSpec: json("base_spec").$type<ContentBaseSpec>(),
  },
  (t) => [...workspaceIndexes(t), uniqueIndex("content_id_unique").on(t.id)],
);

// organic placements
const IGPlacement = z.enum(["IG_FEED", "IG_STORY", "IG_REEL"]);
const FBPlacement = z.enum(["FB_FEED", "FB_STORY", "FB_REEL"]);
const TiktokPlacement = z.enum(["TT_FEED", "TT_STORY"]);

export const AllPlacement = z.enum([
  ...IGPlacement.options,
  ...FBPlacement.options,
  ...TiktokPlacement.options,
]);

export const ContentPublishingStatus = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED_TO_PUBLISH",
  "ARCHIVED",
]);

// placement specifics specs
const FBPlacementSpec = ContentBaseSpec.extend({
  placement: FBPlacement,
  fbPageID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});
const IGPlacementSpec = ContentBaseSpec.extend({
  placement: IGPlacement,
  igAccountID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});
const TiktokPlacementSpec = ContentBaseSpec.extend({
  placement: TiktokPlacement,
  ttAccountID: z.string().optional(),
});

export const PlacementSpecMapping = z.object({
  // FB placements
  FB_FEED: FBPlacementSpec.optional(),
  FB_STORY: FBPlacementSpec.optional(),
  FB_REEL: FBPlacementSpec.optional(),
  // IG placements
  IG_FEED: IGPlacementSpec.optional(),
  IG_STORY: IGPlacementSpec.optional(),
  IG_REEL: IGPlacementSpec.optional(),
  // TikTok placements
  TT_FEED: TiktokPlacementSpec.optional(),
  TT_STORY: TiktokPlacementSpec.optional(),
});

export type PlacementSpecMapping = z.infer<typeof PlacementSpecMapping>;

export const PlacementSpec = z.union([
  FBPlacementSpec,
  IGPlacementSpec,
  TiktokPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;

// represents a unified content item.
// if scheduled & drafts, it has a pending content group
// else, it might not, since it's backfilled & lazy synced from source platforms.
export const unifiedContentTable = mysqlTable(
  "unified_content",
  {
    ...workspaceID,
    ...timestamps,
    // (?) pending content group
    pendingContentGroupId: ulid("pending_content_group_id"),
    // source content json, synced from platforms
    sourceContent: json("source_content"),
    // spec of the specific placement, used for publishing
    placement_spec: json("placement_spec").$type<PlacementSpec>(),
    // internal, where this is going to
    placement: mysqlEnum("placement", AllPlacement.options).notNull(),
    // status
    status: mysqlEnum("status", ContentPublishingStatus.options)
      .notNull()
      .default(ContentPublishingStatus.enum.DRAFT),
    // some normalized fields
    scheduledPublishAt: timestamp("scheduled_publish_at"),
  },
  (t) => [...workspaceIndexes(t)],
);

// ------- DTO -------
export const UnifiedContentDTO = z.object({
  id: z.string(),
  workspaceID: z.string(),
  timeCreated: z.date(),
  timeUpdated: z.date(),
  pendingContentGroupId: z.string().optional(),
  // TODO: update this to use zod schema for each platform's source content
  sourceContent: z.record(z.any(), z.any()).optional(),
  placement_spec: PlacementSpec.optional(),
  placement: AllPlacement,
  status: ContentPublishingStatus,
  scheduledPublishAt: z.date().optional(),
});

export const PendingContentGroupDTO = z.object({
  id: z.string(),
  workspaceID: z.string(),
  timeCreated: z.date(),
  timeUpdated: z.date(),
  baseSpec: ContentBaseSpec.optional(),
});
