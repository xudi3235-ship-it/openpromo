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

export const JobQueueMessageSchema = z.discriminatedUnion("type", [
  WorkspaceMetricsMessageSchema,
  ImageCleanupMessageSchema,
  VideoCleanupMessageSchema,
]);

export type JobQueueMessage = z.infer<typeof JobQueueMessageSchema>;

type WorkspaceMetricsMessage = z.infer<typeof WorkspaceMetricsMessageSchema>;
type ImageCleanupMessage = z.infer<typeof ImageCleanupMessageSchema>;
type VideoCleanupMessage = z.infer<typeof VideoCleanupMessageSchema>;

async function handleWorkspaceMetricsMessage(message: WorkspaceMetricsMessage) {
  await runWorkspaceMetricsTask(message.workspaceId);
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

export async function processJobQueueBatch(
  batch: MessageBatch<JobQueueMessage>,
  env: ApiEnv["Bindings"],
  _ctx?: ExecutionContext,
) {
  console.log(
    `processing job queue batch of ${batch.messages.length} messages`,
  );

  for (const message of batch.messages) {
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
          case "storage.workspace.images.cleanup":
            await handleImageCleanupMessage(job);
            break;
          case "storage.workspace.videos.cleanup":
            await handleVideoCleanupMessage(job);
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
