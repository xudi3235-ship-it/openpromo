import { type ApiEnv, Binding } from "./helpers/api-env";
import { Database, db } from "./helpers/db";
import type { JobQueueMessage } from "./queues/job-queue";
import { workspacesTable } from "./schemas/workspaces.sql";
import { env as runtimeEnv } from "./utils/env";
import { Log } from "./utils/log";

const log = Log.create({ namespace: "cron" });
const metricsLog = Log.create({ namespace: "cron.metrics" });

// entrypoint for worker's cron jobs
export async function scheduledHandler(
  controller: ScheduledController,
  env: ApiEnv["Bindings"],
  _ctx: ExecutionContext,
) {
  const connectionString =
    env.HYPERDRIVE?.connectionString ?? runtimeEnv.DATABASE_URL;
  try {
    await Database.provide(connectionString, () =>
      Binding.provide(env, async () => handleCron(controller)),
    );
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
  await enqueueImageCleanup();
  await enqueueVideoCleanup();
}

async function enqueueImageCleanup() {
  const msg = {
    type: "storage.images.cleanup",
    actor: {
      type: "system",
      properties: {
        userID: "cron-job",
      },
    },
  } satisfies JobQueueMessage;

  await Binding.use().JobQueue.sendBatch([{ body: msg }]);
  log.info("enqueued image cleanup task");
}

async function enqueueVideoCleanup() {
  const msg = {
    type: "storage.videos.cleanup",
    actor: {
      type: "system",
      properties: {
        userID: "cron-job",
      },
    },
  } satisfies JobQueueMessage;

  await Binding.use().JobQueue.sendBatch([{ body: msg }]);
  log.info("enqueued video cleanup task");
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
