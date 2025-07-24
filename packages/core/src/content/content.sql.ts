import {
  foreignKey,
  json,
  MySqlColumnBuilder,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { timestamps, ulid, workspaceID } from "../drizzle/types";
import z from "zod";
import { workspaceIndexes } from "../workspace/workspace.sql";

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
const attachmentSpec = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  s3Key: z.string().optional(),
  mimeType: z.string().optional(),
});

// internal content spec.
// platform agnostic representation of a "post" item.
const contentBaseSpec = z.object({
  title: z.string().optional(),
  bodyText: z.string().optional(),
  attachments: z.array(attachmentSpec).optional(),
  metadata: z.record(z.any()).optional(),
});

type ContentBaseSpec = z.infer<typeof contentBaseSpec>;

// core content table
export const contentTable = mysqlTable(
  "content",
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
const FBPlacementSpec = contentBaseSpec.extend({
  placement: FBPlacement,
  fbPageID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});
const IGPlacementSpec = contentBaseSpec.extend({
  placement: IGPlacement,
  igAccountID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});

const PlacementSpec = z.union([FBPlacementSpec, IGPlacementSpec]);

export type PlacementSpec = z.infer<typeof PlacementSpec>;

// content publishing table
export const contentPublishingTable = mysqlTable(
  "content_publishing",
  {
    ...workspaceID,
    ...timestamps,
    contentID: ulid("content_id").notNull(),
    placement_spec: json("placement_spec").$type<PlacementSpec>(),
    placement: mysqlEnum("placement", [...AllPlacement.options]).notNull(),
    status: mysqlEnum("status", [...ContentPublishingStatus.options])
      .notNull()
      .default(ContentPublishingStatus.enum.DRAFT),
    scheduledPublishAt: timestamp("scheduled_publish_at"),
  },
  (t) => [
    ...workspaceIndexes(t),
    foreignKey({
      name: "fk_content_publishing_content",
      columns: [t.workspaceID, t.contentID],
      foreignColumns: [contentTable.workspaceID, contentTable.id],
    }),
  ],
);
