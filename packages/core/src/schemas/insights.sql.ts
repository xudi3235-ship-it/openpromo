import { id, timestamp, timestamps, ulid } from "@core/database/types";
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

const snapshotNarrativeSchema = z.object({
  headline: z.string(),
  body: z.string().optional(),
  metric: z.string().optional(),
  delta: z.number().optional(),
  platform: z.string().optional(),
});

const snapshotFunnelSchema = z.object({
  awareness: z.number().optional(),
  engagement: z.number().optional(),
  clicks: z.number().optional(),
  conversions: z.number().optional(),
  conversionRate: z.number().optional(),
});

const snapshotGoalSchema = z.object({
  goalId: z.string(),
  status: z.string(),
  progressPercent: z.number().optional(),
  streak: z.number().optional(),
});

const snapshotAnomalySchema = z.object({
  metric: z.string(),
  severity: z.string().optional(),
  detectedAt: z.coerce.date().optional(),
  insight: z.string().optional(),
});

const snapshotTopContentSchema = z.object({
  contentId: z.string(),
  title: z.string().optional(),
  metric: z.string().optional(),
  change: z.number().optional(),
  platform: z.string().optional(),
});

export const workspaceInsightSnapshotPayloadSchema = z.object({
  date: z.coerce.date(),
  funnel: snapshotFunnelSchema.optional(),
  narrativeHighlights: z.array(snapshotNarrativeSchema).optional(),
  topContent: z.array(snapshotTopContentSchema).optional(),
  goals: z.array(snapshotGoalSchema).optional(),
  anomalies: z.array(snapshotAnomalySchema).optional(),
});

export type WorkspaceInsightSnapshotPayload = z.infer<
  typeof workspaceInsightSnapshotPayloadSchema
>;

export const workspaceInsightSnapshotsTable = pgTable(
  "workspace_insight_snapshots",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    snapshotDate: timestamp().notNull(),
    payload: jsonb("payload")
      .$type<WorkspaceInsightSnapshotPayload>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex().on(t.workspaceId, t.snapshotDate),
    index().on(t.workspaceId, t.createdAt),
  ],
);

const snapshotSchemaOpts = {
  payload: workspaceInsightSnapshotPayloadSchema.optional(),
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

const insightEventPayloadSchema = z.object({
  message: z.string(),
  metric: z.string().optional(),
  delta: z.number().optional(),
  relatedContentId: z.string().optional(),
});

export type InsightEventPayload = z.infer<typeof insightEventPayloadSchema>;

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
  payload: insightEventPayloadSchema.optional(),
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
