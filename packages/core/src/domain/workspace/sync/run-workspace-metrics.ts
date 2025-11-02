import { db, eq } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import type { JobQueueMessage } from "@core/queues/job-queue";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import { WorkspaceSyncTaskType } from "@shared/workspace";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
  WORKSPACE_ROLE,
} from "@shared/workspace/auth";

const log = Log.create({ namespace: "workspace-sync.metrics-runner" });

export async function runWorkspaceMetricsTask(workspaceId: string) {
  const [workspace] = await db()
    .select({
      id: workspacesTable.id,
      slug: workspacesTable.slug,
      organizationId: workspacesTable.organizationId,
    })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);

  if (!workspace) {
    log.warn("workspace not found for metrics task", { workspaceId });
    return;
  }

  const stub = Binding.use().WorkspaceSyncCoordinator.getByName(workspace.slug);
  await stub.initialize({
    workspaceSlug: workspace.slug,
    workspaceId: workspace.id,
  });

  const actor = Actor.create("workspace_user", {
    userID: "workspace-metrics-runner",
    dbUserID: "workspace-metrics-runner",
    email: "workspace-metrics@openpromo.app",
    organizationID: workspace.organizationId,
    role: ORGANIZATION_ROLE.ADMIN,
    featureFlags: [],
    permissions: [],
    workspaceID: workspace.id,
    workspaceSlug: workspace.slug,
    workspacePermissions: [WORKSPACE_PERMISSION.ALL],
    workspaceRole: WORKSPACE_ROLE.ADMIN,
  });

  await stub.upsertTask(WorkspaceSyncTaskType.ContentMetricsRefresh, {});
  const { task } = await stub.runTask(
    actor,
    WorkspaceSyncTaskType.ContentMetricsRefresh,
  );

  if (!task) {
    log.warn("workspace metrics task returned no task state", {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    });
    return;
  }

  log.info("workspace metrics task executed", {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    cursor: task.metadata.cursor,
    pendingIds: task.metadata.pendingContentIds?.length ?? 0,
    exhausted: task.metadata.exhausted ?? false,
  });

  const hasPendingIds = (task.metadata.pendingContentIds?.length ?? 0) > 0;
  const hasCursor = task.metadata.cursor !== null;
  const exhausted = task.metadata.exhausted ?? false;

  if (!exhausted && (hasPendingIds || hasCursor)) {
    const now = Date.now();
    const delayMs = task.nextRunAt ? Math.max(task.nextRunAt - now, 0) : 0;
    const delaySeconds = delayMs > 0 ? Math.ceil(delayMs / 1000) : undefined;

    await Binding.use().JobQueue.send(
      {
        type: "workspace.metrics.refresh",
        workspaceId: workspace.id,
        actor: {
          type: "system",
          properties: {
            userID: "workspace-metrics-runner",
          },
        },
      } satisfies JobQueueMessage,
      delaySeconds ? { delaySeconds } : undefined,
    );

    log.info("workspace metrics task re-enqueued", {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      delaySeconds: delaySeconds ?? 0,
    });
  }
}
