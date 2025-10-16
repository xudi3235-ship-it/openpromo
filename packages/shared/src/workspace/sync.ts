import { z } from "zod";

export enum WorkspaceSyncTaskType {
  ContentMetricsRefresh = "content.metrics.refresh",
}

export const ContentMetricsMetadataSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pendingContentIds: z.array(z.string()).min(1).optional(),
    batchSize: z.number().int().positive().max(200).default(50),
    retryCount: z.number().int().nonnegative().default(0),
  })
  .strict();

export type ContentMetricsMetadata = z.infer<
  typeof ContentMetricsMetadataSchema
>;

const ContentMetricsTaskSchema = z
  .object({
    type: z.literal(WorkspaceSyncTaskType.ContentMetricsRefresh),
    key: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
    lastTriggeredAt: z.number().int().nonnegative().optional(),
    nextRunAt: z.number().int().nonnegative().optional(),
    metadata: ContentMetricsMetadataSchema,
  })
  .strict();

export type ContentMetricsTask = z.infer<typeof ContentMetricsTaskSchema>;

export const WorkspaceSyncTaskSchema = ContentMetricsTaskSchema;
export type WorkspaceSyncTask = ContentMetricsTask;

export const WorkspaceSyncTaskStoreSchema = z.record(
  z.string(),
  WorkspaceSyncTaskSchema,
);
export type WorkspaceSyncTaskStore = Record<string, WorkspaceSyncTask>;

const ContentMetricsTaskCreateSchema = z
  .object({
    key: z.string().min(1),
    createdAt: z.number().int().nonnegative().optional(),
    lastTriggeredAt: z.number().int().nonnegative().optional(),
    nextRunAt: z.number().int().nonnegative().optional(),
    metadata: ContentMetricsMetadataSchema.optional(),
  })
  .strict();

export type WorkspaceSyncTaskCreateInput = z.input<
  typeof ContentMetricsTaskCreateSchema
>;

export const ContentMetricsTaskPatchSchema = z
  .object({
    metadata: ContentMetricsMetadataSchema.partial().optional(),
    nextRunAt: z.number().int().nonnegative().nullable().optional(),
    lastTriggeredAt: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export type WorkspaceSyncTaskPatch = z.infer<
  typeof ContentMetricsTaskPatchSchema
>;

const METADATA_DEFAULTS: ContentMetricsMetadata = {
  cursor: null,
  pendingContentIds: undefined,
  batchSize: 50,
  retryCount: 0,
};

function normalizeMetadata(
  previous?: ContentMetricsMetadata,
  patch?: Partial<ContentMetricsMetadata>,
): ContentMetricsMetadata {
  const merged = {
    ...METADATA_DEFAULTS,
    ...(previous ?? {}),
    ...(patch ?? {}),
  };

  return ContentMetricsMetadataSchema.parse(merged);
}

export function createWorkspaceSyncTask(
  input: WorkspaceSyncTaskCreateInput,
): WorkspaceSyncTask {
  const base = ContentMetricsTaskCreateSchema.parse(input);

  const metadata = normalizeMetadata(undefined, base.metadata);

  return WorkspaceSyncTaskSchema.parse({
    type: WorkspaceSyncTaskType.ContentMetricsRefresh,
    key: base.key,
    createdAt: base.createdAt ?? Date.now(),
    lastTriggeredAt: base.lastTriggeredAt ?? undefined,
    nextRunAt: base.nextRunAt ?? undefined,
    metadata,
  });
}

export function parseWorkspaceSyncTaskPatch(
  patch?: WorkspaceSyncTaskPatch,
): WorkspaceSyncTaskPatch {
  return ContentMetricsTaskPatchSchema.parse(patch ?? {});
}

export function mergeWorkspaceSyncTask(
  state: WorkspaceSyncTask,
  patch: WorkspaceSyncTaskPatch,
): WorkspaceSyncTask {
  const parsed = parseWorkspaceSyncTaskPatch(patch);

  const metadata =
    parsed.metadata !== undefined
      ? normalizeMetadata(state.metadata, parsed.metadata)
      : state.metadata;

  const nextRunAt =
    parsed.nextRunAt !== undefined
      ? (parsed.nextRunAt ?? undefined)
      : state.nextRunAt;
  const lastTriggeredAt =
    parsed.lastTriggeredAt !== undefined
      ? (parsed.lastTriggeredAt ?? undefined)
      : state.lastTriggeredAt;

  return WorkspaceSyncTaskSchema.parse({
    ...state,
    metadata,
    nextRunAt,
    lastTriggeredAt,
  });
}

export type WorkspaceSyncTaskMetadata = ContentMetricsMetadata;
