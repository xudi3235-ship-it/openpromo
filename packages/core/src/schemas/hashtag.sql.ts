import { id, timestamp } from "@core/helpers/db";
import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
import { platformPgEnum } from "./connected-account.sql";

const metadataSchema = z.object({
  rawData: z.any().optional(),
});

export const hashtagSnapshotTable = pgTable(
  "hashtag_snapshot",
  {
    ...id,
    normalizedTag: text("normalized_tag").notNull(),
    displayTag: text("display_tag"),
    platform: platformPgEnum().notNull(),
    usageCount: bigint("usage_count", { mode: "number" }),
    viewCount: bigint("view_count", { mode: "number" }),
    lastFetchedAt: timestamp().notNull().defaultNow(),
    metadata: jsonb("metadata").$type<z.infer<typeof metadataSchema> | null>(),
  },
  (t) => [
    uniqueIndex("hashtag_snapshot_platform_tag_idx").on(
      t.platform,
      t.normalizedTag,
    ),
    index("hashtag_snapshot_fetched_idx").on(t.lastFetchedAt),
  ],
);

const opts = {
  displayTag: z.string().optional().nullable(),
  usageCount: z.number().optional().nullable(),
  viewCount: z.number().optional().nullable(),
  lastFetchedAt: z.coerce.date(),
  metadata: metadataSchema.optional(),
};

export const HashtagSnapshotInsert = createInsertSchema(
  hashtagSnapshotTable,
  opts,
);
export const HashtagSnapshotUpdate = createUpdateSchema(
  hashtagSnapshotTable,
  opts,
);
export const HashtagSnapshotSelect = createSelectSchema(
  hashtagSnapshotTable,
  opts,
);

export type HashtagSnapshotInsert = z.infer<typeof HashtagSnapshotInsert>;
export type HashtagSnapshotUpdate = z.infer<typeof HashtagSnapshotUpdate>;
export type HashtagSnapshotSelect = z.infer<typeof HashtagSnapshotSelect>;
