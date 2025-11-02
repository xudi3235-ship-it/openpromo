import { db } from "./database/db";
import { type ApiEnv, Binding } from "./helpers/api-env";
import type { JobQueueMessage } from "./queues/job-queue";
import { workspacesTable } from "./schemas/workspaces.sql";
import { Log } from "./utils/log";

const log = Log.create({ namespace: "cron" });
const metricsLog = Log.create({ namespace: "cron.metrics" });

// entrypoint for worker's cron jobs
export async function scheduledHandler(
  controller: ScheduledController,
  env: ApiEnv["Bindings"],
  _ctx: ExecutionContext,
) {
  try {
    Binding.provide(env, async () => handleCron(controller));
  } catch (error) {
    console.error("scheduled handler failed", {
      cron: controller.cron,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function handleCron(controller: ScheduledController) {
  switch (controller.cron) {
    case "0 0 * * *":
      await dailyJob();
      break;
    default:
      log.warn("received unsupported cron schedule", { cron: controller.cron });
  }
  log.info("cron processed", { cron: controller.cron });
}

async function dailyJob() {
  await runWorkspaceContentMetrics();
  await enqueueWorkspaceCleanups();
}

async function enqueueWorkspaceCleanups() {
  const workspaces = await db()
    .select({ id: workspacesTable.id })
    .from(workspacesTable);

  if (workspaces.length === 0) {
    log.info("no workspaces to enqueue for cleanup");
    return;
  }

  const messages = workspaces.flatMap((workspace) => [
    {
      body: {
        type: "storage.workspace.images.cleanup",
        workspaceId: workspace.id,
        actor: {
          type: "system",
          properties: { userID: "cron-job" },
        },
      } satisfies JobQueueMessage,
    },
    {
      body: {
        type: "storage.workspace.videos.cleanup",
        workspaceId: workspace.id,
        actor: {
          type: "system",
          properties: { userID: "cron-job" },
        },
      } satisfies JobQueueMessage,
    },
  ]);

  await Binding.use().JobQueue.sendBatch(messages);

  log.info("enqueued workspace cleanup tasks", {
    totalWorkspaces: workspaces.length,
    totalTasks: messages.length,
  });
}

async function runWorkspaceContentMetrics() {
  const workspaces = await db()
    .select({
      id: workspacesTable.id,
    })
    .from(workspacesTable);

  if (workspaces.length === 0) {
    metricsLog.info("no workspaces to enqueue for metrics");
    return;
  }

  const messages = workspaces.map((workspace) => ({
    body: {
      type: "workspace.metrics.refresh",
      workspaceId: workspace.id,
      actor: {
        type: "system",
        properties: {
          userID: "cron-job",
        },
      },
    } satisfies JobQueueMessage,
  }));

  await Binding.use().JobQueue.sendBatch(messages);

  metricsLog.info("enqueued workspace metrics refresh tasks", {
    totalEnqueued: messages.length,
  });
}
