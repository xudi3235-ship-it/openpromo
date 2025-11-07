import { id, timestamp, timestamps, ulid } from "@core/database/types";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
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
import { workspaceID } from "./workspaces.sql";

export const workspaceGoalTypeEnum = pgEnum("workspace_goal_type", [
  "publish_cadence",
  "reach",
]);

export const workspaceGoalStatusEnum = pgEnum("workspace_goal_status", [
  "active",
  "paused",
  "completed",
]);

export const workspaceGoalCadenceEnum = pgEnum("workspace_goal_cadence", [
  "weekly",
  "monthly",
]);

const workspaceGoalMetadataSchema = z.object({
  ownerUserId: z.string().optional(),
  alertThreshold: z.number().optional(),
});

export type WorkspaceGoalMetadata = z.infer<typeof workspaceGoalMetadataSchema>;

export const workspaceGoalsTable = pgTable(
  "workspace_goals",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    goalType: workspaceGoalTypeEnum().notNull(),
    status: workspaceGoalStatusEnum().notNull().default("active"),
    cadence: workspaceGoalCadenceEnum().notNull().default("weekly"),
    targetValue: integer("target_value").notNull().default(0),
    startDate: timestamp().notNull().defaultNow(),
    metadata: jsonb("metadata")
      .$type<WorkspaceGoalMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [
    index().on(t.workspaceId, t.goalType, t.status),
    uniqueIndex().on(t.workspaceId, t.goalType, t.cadence),
  ],
);

const workspaceGoalSchemaOpts = {
  status: z.enum(workspaceGoalStatusEnum.enumValues),
  goalType: z.enum(workspaceGoalTypeEnum.enumValues),
  cadence: z.enum(workspaceGoalCadenceEnum.enumValues),
  metadata: workspaceGoalMetadataSchema.optional(),
  startDate: z.coerce.date().optional(),
};

export const WorkspaceGoalInsertSchema = createInsertSchema(
  workspaceGoalsTable,
  workspaceGoalSchemaOpts,
);
export const WorkspaceGoalSelectSchema = createSelectSchema(
  workspaceGoalsTable,
  workspaceGoalSchemaOpts,
);
export const WorkspaceGoalUpdateSchema = createUpdateSchema(
  workspaceGoalsTable,
  workspaceGoalSchemaOpts,
);

export type WorkspaceGoalInsert = z.infer<typeof WorkspaceGoalInsertSchema>;
export type WorkspaceGoalSelect = z.infer<typeof WorkspaceGoalSelectSchema>;
export type WorkspaceGoalUpdate = z.infer<typeof WorkspaceGoalUpdateSchema>;

export const workspaceGoalProgressTable = pgTable(
  "workspace_goal_progress",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    goalId: ulid("goal_id")
      .references(() => workspaceGoalsTable.id, { onDelete: "cascade" })
      .notNull(),
    windowStart: timestamp().notNull(),
    windowEnd: timestamp().notNull(),
    actualValue: integer("actual_value").notNull().default(0),
    targetValue: integer("target_value").notNull().default(0),
    streakCount: integer("streak_count").notNull().default(0),
  },
  (t) => [
    index().on(t.workspaceId, t.goalId),
    uniqueIndex().on(t.goalId, t.windowStart, t.windowEnd),
  ],
);

const workspaceGoalProgressSchemaOpts = {
  windowStart: z.coerce.date(),
  windowEnd: z.coerce.date(),
};

export const WorkspaceGoalProgressInsertSchema = createInsertSchema(
  workspaceGoalProgressTable,
  workspaceGoalProgressSchemaOpts,
);
export const WorkspaceGoalProgressSelectSchema = createSelectSchema(
  workspaceGoalProgressTable,
  workspaceGoalProgressSchemaOpts,
);
export const WorkspaceGoalProgressUpdateSchema = createUpdateSchema(
  workspaceGoalProgressTable,
  workspaceGoalProgressSchemaOpts,
);

export type WorkspaceGoalProgressInsert = z.infer<
  typeof WorkspaceGoalProgressInsertSchema
>;
export type WorkspaceGoalProgressSelect = z.infer<
  typeof WorkspaceGoalProgressSelectSchema
>;
export type WorkspaceGoalProgressUpdate = z.infer<
  typeof WorkspaceGoalProgressUpdateSchema
>;
