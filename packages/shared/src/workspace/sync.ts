import { z } from "zod";

export enum WorkspaceSyncTaskType {
  ContentMetricsRefresh = "content.metrics.refresh",
}

export const WorkspaceSyncTaskTypeSchema = z.enum(
  Object.values(WorkspaceSyncTaskType),
);

export const WorkspaceSyncTaskMetadataSchema = z.record(
  z.string(),
  z.unknown(),
);

export const WorkspaceSyncTaskStateSchema = z
  .object({
    key: z.string().min(1),
    type: WorkspaceSyncTaskTypeSchema,
    createdAt: z.number().int().nonnegative(),
    lastTriggeredAt: z.number().int().nonnegative().optional(),
    nextRunAt: z.number().int().nonnegative().optional(),
    metadata: WorkspaceSyncTaskMetadataSchema.optional(),
  })
  .strict();

export const WorkspaceSyncTaskStoreSchema = z.record(
  z.string(),
  WorkspaceSyncTaskStateSchema,
);

export const WorkspaceSyncTaskCreateSchema =
  WorkspaceSyncTaskStateSchema.extend({
    createdAt: WorkspaceSyncTaskStateSchema.shape.createdAt.optional(),
  }).strict();

export const WorkspaceSyncTaskUpsertSchema = z
  .object({
    type: WorkspaceSyncTaskTypeSchema.optional(),
    metadata: WorkspaceSyncTaskMetadataSchema.optional(),
    nextRunAt: z.number().int().nonnegative().optional(),
  })
  .strict()
  .partial()
  .default({});

export type WorkspaceSyncTaskMetadata = z.infer<
  typeof WorkspaceSyncTaskMetadataSchema
>;
export type WorkspaceSyncTaskState = z.infer<
  typeof WorkspaceSyncTaskStateSchema
>;
export type WorkspaceSyncTaskStore = z.infer<
  typeof WorkspaceSyncTaskStoreSchema
>;
export type WorkspaceSyncTaskCreateInput = z.infer<
  typeof WorkspaceSyncTaskCreateSchema
>;
export type WorkspaceSyncTaskUpsertInput = z.infer<
  typeof WorkspaceSyncTaskUpsertSchema
>;

export function createWorkspaceSyncTask<
  T extends WorkspaceSyncTaskType = WorkspaceSyncTaskType,
>(
  input: WorkspaceSyncTaskCreateInput & { type: T },
): WorkspaceSyncTaskState & { type: T } {
  const parsed = WorkspaceSyncTaskCreateSchema.parse(input);
  return WorkspaceSyncTaskStateSchema.parse({
    ...parsed,
    createdAt: parsed.createdAt ?? Date.now(),
  }) as WorkspaceSyncTaskState & { type: T };
}
