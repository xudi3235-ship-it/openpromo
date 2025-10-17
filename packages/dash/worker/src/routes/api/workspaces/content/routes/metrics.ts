import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { WorkspaceSyncTaskType } from "@shared/workspace";
import { Hono } from "hono";

export const metricsRoute = new Hono<ApiEnv>().post("/refresh", async (ctx) => {
  const actor = Actor.assert("workspace_user");
  const stub = ctx.env.WorkspaceSyncCoordinator.getByName(
    actor.properties.workspaceSlug,
  );

  await stub.initialize({
    workspaceSlug: actor.properties.workspaceSlug,
    workspaceId: actor.properties.workspaceID,
  });

  await stub.upsertTask(WorkspaceSyncTaskType.ContentMetricsRefresh, {});
  const { task } = await stub.runTask(
    actor,
    WorkspaceSyncTaskType.ContentMetricsRefresh,
  );

  return ctx.json({ task });
});
