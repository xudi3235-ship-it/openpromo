import { WorkspaceSyncTaskType } from "@shared/workspace";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
} from "@shared/workspace/auth";
import { Actor } from "./helpers/actor";
import { type ApiEnv, Binding } from "./helpers/api-env";
import { Database, db } from "./helpers/db";
import { ImageStorage } from "./helpers/storage/image";
import { VideoStorage } from "./helpers/storage/video";
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
      Binding.provide(env, async () => handleCron(controller, env)),
    );
  } catch (error) {
    console.error("scheduled handler failed", {
      cron: controller.cron,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function handleCron(
  controller: ScheduledController,
  env: ApiEnv["Bindings"],
) {
  switch (controller.cron) {
    case "0 0 * * *":
      await dailyJob(env);
      break;
    default:
      log.warn("received unsupported cron schedule", { cron: controller.cron });
  }
  log.info("cron processed", { cron: controller.cron });
}

async function dailyJob(env: ApiEnv["Bindings"]) {
  await runWorkspaceContentMetrics(env);
  await ImageStorage.batchDeleteImages();
  await VideoStorage.batchDeleteVideos();
}

async function runWorkspaceContentMetrics(env: ApiEnv["Bindings"]) {
  const workspaces = await db()
    .select({
      id: workspacesTable.id,
      slug: workspacesTable.slug,
      organizationId: workspacesTable.organizationId,
    })
    .from(workspacesTable);

  metricsLog.info("starting content metrics refresh sweep", {
    totalWorkspaces: workspaces.length,
  });

  for (const workspace of workspaces) {
    try {
      const stub = env.WorkspaceSyncCoordinator.getByName(workspace.slug);
      await stub.initialize({
        workspaceSlug: workspace.slug,
        workspaceId: workspace.id,
      });

      const actor: Actor.WorkspaceUser = Actor.create("workspace_user", {
        userID: "system-cron",
        dbUserID: "system-cron",
        email: "system@openpromo.app",
        organizationID: workspace.organizationId,
        role: ORGANIZATION_ROLE.ADMIN,
        featureFlags: [],
        permissions: [],
        workspaceID: workspace.id,
        workspaceSlug: workspace.slug,
        workspacePermissions: [WORKSPACE_PERMISSION.ALL],
      });

      await stub.upsertTask(WorkspaceSyncTaskType.ContentMetricsRefresh, {});
      const { task } = await stub.runTask(
        actor,
        WorkspaceSyncTaskType.ContentMetricsRefresh,
      );

      if (!task) {
        metricsLog.warn("content metrics refresh returned no task state", {
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        });
        continue;
      }

      metricsLog.info("content metrics refresh executed", {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        nextRunAt: task.nextRunAt,
        lastTriggeredAt: task.lastTriggeredAt,
      });
    } catch (error) {
      console.error("metrics refresh failed for workspace", {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
