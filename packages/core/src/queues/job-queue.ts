import { runWorkspaceMetricsTask } from "@core/domain/workspace/sync/run-workspace-metrics";
import type { ApiEnv } from "@core/helpers/api-env";
import { Log } from "@core/utils/log";
import { z } from "zod";

const log = Log.create({ namespace: "job-queue" });

const WorkspaceMetricsMessageSchema = z.object({
  type: z.literal("workspace.metrics.refresh"),
  workspaceId: z.string().min(1),
});

export const JobQueueMessageSchema = z.discriminatedUnion("type", [
  WorkspaceMetricsMessageSchema,
]);

export type JobQueueMessage = z.infer<typeof JobQueueMessageSchema>;

type WorkspaceMetricsMessage = z.infer<typeof WorkspaceMetricsMessageSchema>;

async function handleWorkspaceMetricsMessage(
  message: WorkspaceMetricsMessage,
  env: ApiEnv["Bindings"],
) {
  await runWorkspaceMetricsTask(env, message.workspaceId);
}

export async function processJobQueueBatch(
  batch: MessageBatch<JobQueueMessage>,
  env: ApiEnv["Bindings"],
  _ctx?: ExecutionContext,
) {
  for (const message of batch.messages) {
    const parsed = JobQueueMessageSchema.safeParse(message.body);
    if (!parsed.success) {
      log.warn("invalid job queue message", {
        issues: parsed.error.issues,
      });
      message.ack();
      continue;
    }

    const job = parsed.data;

    try {
      switch (job.type) {
        case "workspace.metrics.refresh":
          await handleWorkspaceMetricsMessage(job, env);
          break;
        default:
          log.warn("unsupported job queue message type", {
            type: (job as { type: string }).type,
          });
      }
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
  }
}
