import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Binding } from "@core/helpers/api-env";
import { Database, db, eq } from "@core/helpers/db";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { env as runtimeEnv } from "@core/utils/env";
import { Log } from "@core/utils/log";
import { WorkspaceSyncTaskType } from "@shared/workspace";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
} from "@shared/workspace/auth";

const log = Log.create({ namespace: "workspace-sync.metrics-runner" });

export async function runWorkspaceMetricsTask(
  env: ApiEnv["Bindings"],
  workspaceId: string,
) {
  const connectionString =
    env.HYPERDRIVE?.connectionString ?? runtimeEnv.DATABASE_URL;

  await Database.provide(connectionString, () =>
    Binding.provide(env, async () => {
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

      const stub = env.WorkspaceSyncCoordinator.getByName(workspace.slug);
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
      });

      await stub.upsertTask(WorkspaceSyncTaskType.ContentMetricsRefresh, {});
      await stub.runTask(actor, WorkspaceSyncTaskType.ContentMetricsRefresh);

      log.info("workspace metrics task executed", {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
      });
    }),
  );
}
