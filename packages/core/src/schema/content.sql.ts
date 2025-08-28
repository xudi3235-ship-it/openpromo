import {
  json,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { AllPlacement, type PlacementSpec } from "../content/schema/placement";
import type { ContentBaseSpec } from "../content/schema/placement/common";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";
import { connectedAccount } from "./connected_account.sql";
import { workspaceID } from "./workspaces.sql";

// const baseContentTable = <
//   TTableName extends string,
//   TColumnsMap extends Record<string, MySqlColumnBuilder>,
// >(
//   name: TTableName,
//   columns: TColumnsMap,
// ) => {
//   return mysqlTable(name, {
//     ...workspaceID,
//     ...timestamps,
//     ...columns,
//   });
// };

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
    baseSpec: json("base_spec").$type<ContentBaseSpec>(),
  },
  (t) => [uniqueIndex().on(t.workspaceId, t.id)],
);

/**
 * core data model that represents a piece of content x-plat.
 * For scheduled/draft contents, it's linked to a pending_content_group.
 * Else, it's a published content on the source platform, probably synced / backfilled.
 *
 * We designed this in a unified way to handle scheduling and backfilling. For scheduled contents, the placement_spec is a json objects stored all the params.
 *
 * For backfilled contents, upstream services should transform to placement spec.
 */
export const ContentPublishingStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED_TO_PUBLISH: "FAILED_TO_PUBLISH",
} as const;

export type ContentPublishingStatus =
  (typeof ContentPublishingStatus)[keyof typeof ContentPublishingStatus];

// ----- enums -----
export const publishingStatusPgEnum = pgEnum(
  "publishing_status",
  ContentPublishingStatus,
);
export const placementPgEnum = pgEnum("placement", AllPlacement);

export const unifiedContentTable = pgTable(
  "unified_content",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    connectedAccountId: ulid("connected_account_id")
      .notNull()
      .references(() => connectedAccount.id),

    // declaration of the source platform's spec, json object
    // that defines what a post looks like on src plat.
    // for scheduled contents: the spec will be translated into multiple api calls, kinda like IaC, due to the dependency graph it needs to sort out, e.g. for a carousel IG posts, we need to create videos 1-3 first, then create a media container for these videos, finally we can create a IGMedia.
    // Similarly, for backfilled contents, upstream services should transform to placement spec.
    // this will be source of truth used in publishing, composer, preview, and backfilling.
    placementSpec: json("placement_spec").$type<PlacementSpec>(),
    // internal, where this is going to
    placement: placementPgEnum().notNull(),
    publishingStatus: publishingStatusPgEnum().notNull(),
    // scheduling related fields
    scheduleName: varchar("schedule_name", { length: 255 }),
    scheduledPublishAt: timestamp(),
    pendingContentGroupId: ulid("pending_content_group_id").references(
      () => pendingContentGroupTable.id,
    ),
    // normalized fields
    publishedAt: timestamp(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    title: text("title").notNull(),
  },
  (t) => [uniqueIndex().on(t.id, t.workspaceId, t.connectedAccountId)],
);
