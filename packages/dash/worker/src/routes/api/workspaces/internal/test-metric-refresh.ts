import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { WorkspaceSyncTaskType } from "@shared/workspace";
import { Hono } from "hono";

/**
 * Initialize the workspace sync coordinator with the given actor's workspace details
 */
async function initializeWorkspaceSync(
  env: ApiEnv["Bindings"],
  actor: Actor.WorkspaceUser,
) {
  const stub = env.WorkspaceSyncCoordinator.getByName(
    actor.properties.workspaceSlug,
  );

  await stub.initialize({
    workspaceSlug: actor.properties.workspaceSlug,
    workspaceId: actor.properties.workspaceID,
  });

  return stub;
}

/**
 * Refresh content metrics for a workspace
 */
async function refreshContentMetrics(
  env: ApiEnv["Bindings"],
  actor: Actor.WorkspaceUser,
) {
  const stub = await initializeWorkspaceSync(env, actor);

  await stub.upsertTask(WorkspaceSyncTaskType.ContentMetricsRefresh, {});
  const { task } = await stub.runTask(
    actor,
    WorkspaceSyncTaskType.ContentMetricsRefresh,
  );

  return task;
}

export const testMetricRefreshRoute = new Hono<ApiEnv>().get("/", async (c) => {
  // Test endpoint for metrics refresh within workspace context
  try {
    const actor = Actor.assert("workspace_user");
    console.log("// actor:", actor);

    const task = await refreshContentMetrics(c.env, actor);

    return c.json({
      success: true,
      task,
      message: "Metrics refresh task queued for workspace testing",
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to refresh metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
