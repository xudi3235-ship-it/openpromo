import { id, timestamp, timestamps, ulid } from "@core/database/types";
import {
  type InsightEventPayload,
  InsightEventPayloadSchema,
  type WorkspaceInsightSnapshot,
  WorkspaceInsightSnapshotSchema,
} from "@shared/insights";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
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
import { workspaceGoalsTable } from "./workspace-goals.sql";
import { workspaceID } from "./workspaces.sql";

export const workspaceInsightSnapshotsTable = pgTable(
  "workspace_insight_snapshots",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    snapshotDate: timestamp().notNull(),
    payload: jsonb("payload")
      .$type<WorkspaceInsightSnapshot>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex().on(t.workspaceId, t.snapshotDate),
    index().on(t.workspaceId, t.createdAt),
  ],
);

const snapshotSchemaOpts = {
  payload: WorkspaceInsightSnapshotSchema.optional(),
  snapshotDate: z.coerce.date(),
};

export const WorkspaceInsightSnapshotInsertSchema = createInsertSchema(
  workspaceInsightSnapshotsTable,
  snapshotSchemaOpts,
);
export const WorkspaceInsightSnapshotSelectSchema = createSelectSchema(
  workspaceInsightSnapshotsTable,
  snapshotSchemaOpts,
);
export const WorkspaceInsightSnapshotUpdateSchema = createUpdateSchema(
  workspaceInsightSnapshotsTable,
  snapshotSchemaOpts,
);

export type WorkspaceInsightSnapshotInsert = z.infer<
  typeof WorkspaceInsightSnapshotInsertSchema
>;
export type WorkspaceInsightSnapshotSelect = z.infer<
  typeof WorkspaceInsightSnapshotSelectSchema
>;
export type WorkspaceInsightSnapshotUpdate = z.infer<
  typeof WorkspaceInsightSnapshotUpdateSchema
>;

export const insightEventTypeEnum = pgEnum("insight_event_type", [
  "goal_achieved",
  "goal_at_risk",
  "anomaly_detected",
  "milestone_hit",
  "custom",
]);

export const insightEventSeverityEnum = pgEnum("insight_event_severity", [
  "info",
  "warning",
  "critical",
]);

export const insightEventsTable = pgTable(
  "insight_events",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    eventType: insightEventTypeEnum("event_type").notNull(),
    severity: insightEventSeverityEnum("severity").notNull().default("info"),
    snapshotId: ulid("snapshot_id").references(
      () => workspaceInsightSnapshotsTable.id,
      { onDelete: "set null" },
    ),
    goalId: ulid("goal_id").references(() => workspaceGoalsTable.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload")
      .$type<InsightEventPayload>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    index().on(t.workspaceId, t.eventType, t.createdAt),
    index().on(t.goalId),
  ],
);

const insightEventSchemaOpts = {
  payload: InsightEventPayloadSchema.optional(),
};

export const InsightEventInsertSchema = createInsertSchema(
  insightEventsTable,
  insightEventSchemaOpts,
);
export const InsightEventSelectSchema = createSelectSchema(
  insightEventsTable,
  insightEventSchemaOpts,
);
export const InsightEventUpdateSchema = createUpdateSchema(
  insightEventsTable,
  insightEventSchemaOpts,
);

export type InsightEventInsert = z.infer<typeof InsightEventInsertSchema>;
export type InsightEventSelect = z.infer<typeof InsightEventSelectSchema>;
export type InsightEventUpdate = z.infer<typeof InsightEventUpdateSchema>;
