import {
  json,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import z from "zod";
import { connectedAccount } from "../connected_account/connected_account.sql";
import { timestamp, timestamps, ulid } from "../drizzle/types";
import { workspaceID, workspaceIndexes } from "../workspace/workspace.sql";
import { AllPlacement, PlacementSpec } from "./schema/placement";
import {
  ContentBaseSpec,
  ContentPublishingStatus,
} from "./schema/placement/common";

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

// represents a unified content item.
// if scheduled & drafts, it has a pending content group
// else, it might not, since it's backfilled & lazy synced from source platforms.
export const unifiedContentTable = mysqlTable(
  "unified_content",
  {
    ...workspaceID,
    ...timestamps,
    connectedAccountId: ulid("connected_account_id")
      .notNull()
      .references(() => connectedAccount.id),
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
    scheduleName: varchar("schedule_name", { length: 255 }),
  },
  (t) => [...workspaceIndexes(t)],
);

// ------- DTO -------
export const UnifiedContentDTO = z.object({
  id: z.string(),
  workspaceID: z.string(),
  timeCreated: z.date(),
  timeUpdated: z.date(),
  connectedAccountId: z.string(),
  pendingContentGroupId: z.string().optional(),
  // TODO: update this to use zod schema for each platform's source content
  sourceContent: z.record(z.any(), z.any()).optional(),
  placement_spec: PlacementSpec.optional(),
  placement: AllPlacement,
  status: ContentPublishingStatus,
  scheduledPublishAt: z.date().optional(),
  scheduleName: z.string().optional(),
});

export const PendingContentGroupDTO = z.object({
  id: z.string(),
  workspaceID: z.string(),
  timeCreated: z.date(),
  timeUpdated: z.date(),
  baseSpec: ContentBaseSpec.optional(),
});
