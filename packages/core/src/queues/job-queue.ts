import { runWorkspaceMetricsTask } from "@core/domain/workspace/sync/run-workspace-metrics";
import { Actor } from "@core/helpers/actor";
import { type ApiEnv, Binding } from "@core/helpers/api-env";
import { Database } from "@core/helpers/db";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import { env as runtimeEnv } from "@core/utils/env";
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
  type: z.literal("storage.images.cleanup"),
});

const VideoCleanupMessageSchema = BaseJobMessage.extend({
  type: z.literal("storage.videos.cleanup"),
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

async function handleImageCleanupMessage(_message: ImageCleanupMessage) {
  // TODO: pass in params for workspace info maybe..?
  await ImageStorage.batchDeleteImages({});
  console.log("image cleanup completed");
}

async function handleVideoCleanupMessage(_message: VideoCleanupMessage) {
  await VideoStorage.batchDeleteVideos();
  log.info("video cleanup completed");
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
          case "storage.images.cleanup":
            await handleImageCleanupMessage(job);
            break;
          case "storage.videos.cleanup":
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

    const connectionString =
      env.HYPERDRIVE?.connectionString ?? runtimeEnv.DATABASE_URL;

    // provide context
    return Actor.provide(job.actor.type, job.actor.properties, () => {
      return Database.provide(connectionString, () => {
        return Binding.provide(env, async () => {
          await fn();
        });
      });
    });
  }
}
