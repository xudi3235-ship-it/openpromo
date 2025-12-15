import { refreshWorkspaceTokens } from "@core/domain/connected-account/token-refresher";
import { WorkspaceInsightsAggregator } from "@core/domain/insights/aggregator";
import { runWorkspaceMetricsTask } from "@core/domain/workspace/sync/run-workspace-metrics";
import { Actor } from "@core/helpers/actor";
import { type ApiEnv, Binding } from "@core/helpers/api-env";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import { Log } from "@core/utils/log";
import { z } from "zod";

const log = Log.create({ namespace: "job-queue" });

const BaseJobMessage = z.object({
  actor: Actor.InfoSchema,
});

const WorkspaceMetricsMessageSchema = BaseJobMessage.extend({
  type: z.literal("workspace.metrics.refresh"),
  workspaceId: z.string().min(1),
});

const WorkspaceTokenRefreshMessageSchema = BaseJobMessage.extend({
  type: z.literal("workspace.tokens.refresh"),
  workspaceId: z.string().min(1),
});

const ImageCleanupMessageSchema = BaseJobMessage.extend({
  type: z.literal("storage.workspace.images.cleanup"),
  workspaceId: z.string().min(1),
  cursor: z.string().optional(),
});

const VideoCleanupMessageSchema = BaseJobMessage.extend({
  type: z.literal("storage.workspace.videos.cleanup"),
  workspaceId: z.string().min(1),
  cursor: z.string().optional(),
});

const WorkspaceInsightsSnapshotMessageSchema = BaseJobMessage.extend({
  type: z.literal("workspace.insights.snapshot"),
  workspaceId: z.string().min(1),
});

export const JobQueueMessageSchema = z.discriminatedUnion("type", [
  WorkspaceMetricsMessageSchema,
  WorkspaceTokenRefreshMessageSchema,
  ImageCleanupMessageSchema,
  VideoCleanupMessageSchema,
  WorkspaceInsightsSnapshotMessageSchema,
]);

export type JobQueueMessage = z.infer<typeof JobQueueMessageSchema>;

/**
 * R2 Event Notification message format (from Cloudflare)
 * @see https://developers.cloudflare.com/r2/buckets/event-notifications/
 */
export const R2EventMessageSchema = z.object({
  account: z.string(),
  action: z.enum([
    "PutObject",
    "CopyObject",
    "CompleteMultipartUpload",
    "DeleteObject",
    "LifecycleDeletion",
  ]),
  bucket: z.string(),
  object: z.object({
    key: z.string(),
    size: z.number().optional(),
    eTag: z.string().optional(),
  }),
  eventTime: z.string(),
  copySource: z
    .object({
      bucket: z.string(),
      object: z.string(),
    })
    .optional(),
});

export type R2EventMessage = z.infer<typeof R2EventMessageSchema>;

type WorkspaceMetricsMessage = z.infer<typeof WorkspaceMetricsMessageSchema>;
type WorkspaceTokenRefreshMessage = z.infer<
  typeof WorkspaceTokenRefreshMessageSchema
>;
type ImageCleanupMessage = z.infer<typeof ImageCleanupMessageSchema>;
type VideoCleanupMessage = z.infer<typeof VideoCleanupMessageSchema>;
type WorkspaceInsightsSnapshotMessage = z.infer<
  typeof WorkspaceInsightsSnapshotMessageSchema
>;

async function handleWorkspaceMetricsMessage(message: WorkspaceMetricsMessage) {
  await runWorkspaceMetricsTask(message.workspaceId);
}

async function handleWorkspaceTokenRefreshMessage(
  message: WorkspaceTokenRefreshMessage,
) {
  const result = await refreshWorkspaceTokens(message.workspaceId);

  log.info("workspace token refresh completed", {
    workspaceId: message.workspaceId,
    processed: result.processed,
    refreshed: result.refreshed,
    skipped: result.skipped,
    failures: result.failures.length,
  });

  if (result.failures.length > 0) {
    log.warn("workspace token refresh encountered failures", {
      workspaceId: message.workspaceId,
      failures: result.failures,
    });
  }
}

async function handleImageCleanupMessage(message: ImageCleanupMessage) {
  const { workspaceId, cursor } = message;

  const result = await ImageStorage.cleanupBatch({
    workspaceId,
    cursor,
    limit: 50,
  });

  log.info("workspace image cleanup batch completed", {
    workspaceId,
    processed: result.processed,
    deleted: result.deleted,
    hasMore: result.hasMore,
  });

  // If more work remains, enqueue next batch
  if (result.hasMore && result.nextCursor) {
    await Binding.use().JobQueue.send({
      type: "storage.workspace.images.cleanup",
      workspaceId,
      cursor: result.nextCursor,
      actor: message.actor,
    } satisfies JobQueueMessage);

    log.info("enqueued next image cleanup batch", {
      workspaceId,
      cursor: result.nextCursor,
    });
  }
}

async function handleVideoCleanupMessage(message: VideoCleanupMessage) {
  const { workspaceId, cursor } = message;

  const result = await VideoStorage.cleanupBatch({
    workspaceId,
    cursor,
    limit: 10,
  });

  log.info("workspace video cleanup batch completed", {
    workspaceId,
    processed: result.processed,
    deleted: result.deleted,
    hasMore: result.hasMore,
  });

  // If more work remains, enqueue next batch
  if (result.hasMore && result.nextCursor) {
    await Binding.use().JobQueue.send({
      type: "storage.workspace.videos.cleanup",
      workspaceId,
      cursor: result.nextCursor,
      actor: message.actor,
    } satisfies JobQueueMessage);

    log.info("enqueued next video cleanup batch", {
      workspaceId,
      cursor: result.nextCursor,
    });
  }
}

async function handleWorkspaceInsightsSnapshotMessage(
  message: WorkspaceInsightsSnapshotMessage,
) {
  const aggregator = new WorkspaceInsightsAggregator();
  const snapshot = await aggregator.generateSnapshotForWorkspace({
    workspaceId: message.workspaceId,
  });

  log.info("workspace insights snapshot generated", {
    workspaceId: message.workspaceId,
    snapshotDate: snapshot.date,
    reach: snapshot.funnel?.awareness ?? 0,
    engagement: snapshot.funnel?.engagement ?? 0,
  });
}

const REFERENCE_BUCKET_NAME = "openpromo-reference";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm"];

// Prefix filters to prevent infinite recursion
const INGEST_PREFIX = "ingest/";
const IMAGES_PREFIX = "images/";
const VIDEOS_PREFIX = "videos/";

async function handleR2EventMessage(event: R2EventMessage) {
  // Only process events from reference bucket
  if (event.bucket !== REFERENCE_BUCKET_NAME) {
    log.info("skipping R2 event from non-reference bucket", {
      bucket: event.bucket,
    });
    return;
  }

  const key = event.object.key.toLowerCase();

  // Determine event type
  const isDeleteEvent = ["DeleteObject", "LifecycleDeletion"].includes(
    event.action,
  );
  const isCreateEvent = [
    "PutObject",
    "CopyObject",
    "CompleteMultipartUpload",
  ].includes(event.action);

  // For CREATE events: only process ingest/ (prevents recursion from processed files)
  if (isCreateEvent && !key.startsWith(INGEST_PREFIX)) {
    log.info("skipping create event outside ingest directory", { key });
    return;
  }

  // For DELETE events: only process images/ or videos/ (cleanup vectors)
  if (
    isDeleteEvent &&
    !key.startsWith(IMAGES_PREFIX) &&
    !key.startsWith(VIDEOS_PREFIX)
  ) {
    log.info("skipping delete event outside images/videos directories", {
      key,
    });
    return;
  }

  const isImage = IMAGE_EXTENSIONS.some((ext) => key.endsWith(ext));
  const isVideo = VIDEO_EXTENSIONS.some((ext) => key.endsWith(ext));
  if (!isImage && !isVideo) {
    log.info("skipping non-image and non-video R2 event", {
      key: event.object.key,
    });
    return;
  }

  // Import dynamically to avoid circular dependency
  const { ReferenceSearch } = await import(
    "@core/domain/reference/reference-search"
  );

  // Handle delete events (cleanup vectors when source deleted from images/ or videos/)
  if (isDeleteEvent) {
    log.info("processing reference deletion", {
      key: event.object.key,
      action: event.action,
    });
    await ReferenceSearch.remove(event.object.key);
    return;
  }

  // Handle create events (process new files from ingest/)
  if (isCreateEvent) {
    log.info("processing reference upload from ingest", {
      key: event.object.key,
      size: event.object.size,
      action: event.action,
    });
    if (isImage) {
      await ReferenceSearch.processImage(event.object.key);
    } else if (isVideo) {
      await ReferenceSearch.processVideo(event.object.key);
    } else {
      log.warn("unhandled reference media type", { key: event.object.key });
    }
  }
}

/** Union type for all messages the queue can receive */
export type QueueMessage = JobQueueMessage | R2EventMessage;

export async function processJobQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: ApiEnv["Bindings"],
  _ctx?: ExecutionContext,
) {
  console.log(
    `processing job queue batch of ${batch.messages.length} messages`,
  );

  for (const message of batch.messages) {
    // Try parsing as R2 event first (has 'bucket' field)
    const r2Parsed = R2EventMessageSchema.safeParse(message.body);
    if (r2Parsed.success) {
      try {
        await Binding.provide(env, () => handleR2EventMessage(r2Parsed.data));
        message.ack();
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : String(error);
        console.error("R2 event message failed", {
          bucket: r2Parsed.data.bucket,
          key: r2Parsed.data.object.key,
          error: messageText,
        });
        message.retry();
      }
      continue;
    }

    // Try parsing as job queue message
    const parsed = JobQueueMessageSchema.safeParse(message.body);
    if (!parsed.success) {
      log.warn("invalid job queue message", {
        body: message.body,
        issues: parsed.error.issues,
      });
      message.ack();
      continue;
    }

    const job = parsed.data;
    const fn = async () => {
      try {
        switch (job.type) {
          case "workspace.metrics.refresh":
            await handleWorkspaceMetricsMessage(job);
            break;
          case "workspace.tokens.refresh":
            await handleWorkspaceTokenRefreshMessage(job);
            break;
          case "storage.workspace.images.cleanup":
            await handleImageCleanupMessage(job);
            break;
          case "storage.workspace.videos.cleanup":
            await handleVideoCleanupMessage(job);
            break;
          case "workspace.insights.snapshot":
            await handleWorkspaceInsightsSnapshotMessage(job);
            break;
          default:
            log.warn("unsupported job queue message type", {
              type: (job as { type: string }).type,
            });
        }
        console.log("job queue message processed", { type: job.type });
        message.ack();
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : String(error);
        console.error("job queue message failed", {
          type: job.type,
          error: messageText,
        });
        message.retry();
      }
    };

    // provide context for each message
    Actor.provide(job.actor.type, job.actor.properties, () => {
      return Binding.provide(env, fn);
    });
  }
}
