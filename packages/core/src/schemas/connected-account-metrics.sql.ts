import { id, timestamp, timestamps } from "@core/helpers/db";
import { AllPlatformsZod } from "@shared/content";
import { index, integer, jsonb, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { connectedAccountId, platformPgEnum } from "./connected-account.sql";
import { workspaceID } from "./workspaces.sql";

export const connectedAccountMetricsSnapshotTable = pgTable(
  "connected_account_metrics_snapshot",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    ...connectedAccountId,
    platform: platformPgEnum().notNull(),
    collectedAt: timestamp().notNull().defaultNow(),
    followersCount: integer("followers_count"),
    followingCount: integer("following_count"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    index().on(table.workspaceId, table.collectedAt),
    index().on(table.connectedAccountId, table.collectedAt),
    index().on(table.workspaceId, table.platform, table.collectedAt),
  ],
);

export const ConnectedAccountMetricsSnapshotSelect = createSelectSchema(
  connectedAccountMetricsSnapshotTable,
  {
    platform: AllPlatformsZod,
  },
);

export type ConnectedAccountMetricsSnapshot = z.infer<
  typeof ConnectedAccountMetricsSnapshotSelect
>;

export const ConnectedAccountMetricsSnapshotInsert = createInsertSchema(
  connectedAccountMetricsSnapshotTable,
  {
    platform: AllPlatformsZod,
  },
);

export type ConnectedAccountMetricsSnapshotInsertInput = z.infer<
  typeof ConnectedAccountMetricsSnapshotInsert
>;
