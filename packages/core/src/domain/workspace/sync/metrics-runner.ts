import {
  ContentMetricsRefresher,
  type ContentMetricsTarget,
} from "@core/domain/content/metrics";
import { Actor } from "@core/helpers/actor";
import { and, db, eq, gt, inArray } from "@core/helpers/db";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import {
  mergeWorkspaceSyncTask,
  type WorkspaceSyncTask,
  type WorkspaceSyncTaskMetadata,
  type WorkspaceSyncTaskPatch,
  WorkspaceSyncTaskType,
} from "@shared/workspace";
import {
  ORGANIZATION_ROLE,
  WORKSPACE_PERMISSION,
} from "@shared/workspace/auth";
import { asc } from "drizzle-orm";
import type {
  RunTaskParams,
  TaskRunResult,
  WorkspaceSyncTaskRunner,
} from "./types";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const EMPTY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETRY_BASE_DELAY_MS = 5 * 60 * 1000;
const RETRY_MAX_DELAY_MS = 6 * 60 * 60 * 1000;

const log = Log.create({ namespace: "workspace-sync.metrics" });

export class WorkspaceContentMetricsRunner implements WorkspaceSyncTaskRunner {
  private readonly metricsRefresher: ContentMetricsRefresher;

  constructor() {
    this.metricsRefresher = new ContentMetricsRefresher();
  }

  canRun(task: WorkspaceSyncTask): boolean {
    return task.type === WorkspaceSyncTaskType.ContentMetricsRefresh;
  }

  async run(params: RunTaskParams): Promise<TaskRunResult> {
    const { workspaceId, task } = params;
    const startedAt = Date.now();

    let nextTask = mergeWorkspaceSyncTask(task, {
      lastTriggeredAt: startedAt,
    });

    try {
      const batch = await this.loadBatch(workspaceId, nextTask.metadata);

      if (batch.targets.length === 0) {
        const delay = batch.exhausted ? EMPTY_INTERVAL_MS : DEFAULT_INTERVAL_MS;
        nextTask = mergeWorkspaceSyncTask(nextTask, {
          metadata: this.buildMetadataPatch(nextTask.metadata, {
            cursor: batch.nextCursor,
            pendingContentIds: batch.remainingPendingIds,
            retryCount: 0,
          }),
          nextRunAt: startedAt + delay,
        });
        return { task: nextTask };
      }

      const [workspaceInfo] = await db()
        .select({
          slug: workspacesTable.slug,
          organizationId: workspacesTable.organizationId,
        })
        .from(workspacesTable)
        .where(eq(workspacesTable.id, workspaceId))
        .limit(1);

      const actor = Actor.create("workspace_user", {
        userID: "workspace-metrics-runner",
        dbUserID: "workspace-metrics-runner",
        email: "workspace-metrics@openpromo.app",
        organizationID: workspaceInfo?.organizationId ?? "unknown",
        role: ORGANIZATION_ROLE.ADMIN,
        featureFlags: [],
        permissions: [],
        workspaceID: workspaceId,
        workspaceSlug: workspaceInfo?.slug ?? workspaceId,
        workspacePermissions: [WORKSPACE_PERMISSION.ALL],
      });

      const refreshTargets = batch.targets.filter((target) => {
        if (target.placement === "TT_FEED") {
          log.info("skipping metrics refresh for unsupported placement", {
            workspaceId,
            contentId: target.id,
            placement: target.placement,
          });
          return false;
        }
        return true;
      });

      const refreshResult = await Actor.provide(
        actor.type,
        actor.properties,
        () => this.metricsRefresher.refresh(workspaceId, refreshTargets),
      );

      console.log("Metrics refresh result:", refreshResult);

      const hadFailures = refreshResult.failures.length > 0;
      const retryCount = hadFailures
        ? (nextTask.metadata.retryCount ?? 0) + 1
        : 0;
      const delay = hadFailures
        ? Math.min(
            RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1),
            RETRY_MAX_DELAY_MS,
          )
        : DEFAULT_INTERVAL_MS;

      nextTask = mergeWorkspaceSyncTask(nextTask, {
        metadata: this.buildMetadataPatch(nextTask.metadata, {
          cursor: batch.nextCursor,
          pendingContentIds: batch.remainingPendingIds,
          retryCount,
        }),
        nextRunAt: startedAt + delay,
      });

      log.info("content metrics refresh finished", {
        workspaceId,
        processed: refreshResult.processed,
        updated: refreshResult.updated,
        failures: refreshResult.failures.length,
      });

      return { task: nextTask };
    } catch (error) {
      const retryCount = (nextTask.metadata.retryCount ?? 0) + 1;
      const delay = Math.min(
        RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1),
        RETRY_MAX_DELAY_MS,
      );

      nextTask = mergeWorkspaceSyncTask(nextTask, {
        metadata: this.buildMetadataPatch(nextTask.metadata, {
          retryCount,
        }),
        nextRunAt: startedAt + delay,
      });

      console.error("content metrics refresh failed", {
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause:
          error instanceof Error && "cause" in error
            ? (error as Error & { cause?: unknown }).cause
            : undefined,
        retryCount,
      });

      throw error;
    }
  }

  private buildMetadataPatch(
    current: WorkspaceSyncTaskMetadata,
    updates: Partial<WorkspaceSyncTaskMetadata>,
  ): WorkspaceSyncTaskPatch["metadata"] {
    const patch: WorkspaceSyncTaskPatch["metadata"] = {};

    if ("cursor" in updates) {
      patch.cursor = updates.cursor ?? null;
    }
    if ("pendingContentIds" in updates) {
      patch.pendingContentIds = updates.pendingContentIds;
    }
    if ("batchSize" in updates) {
      patch.batchSize = updates.batchSize;
    } else {
      patch.batchSize = current.batchSize;
    }
    if ("retryCount" in updates) {
      patch.retryCount = updates.retryCount;
    }

    return patch;
  }

  private async loadBatch(
    workspaceId: string,
    metadata: WorkspaceSyncTaskMetadata,
  ): Promise<{
    targets: ContentMetricsTarget[];
    nextCursor: string | null;
    remainingPendingIds?: string[];
    exhausted: boolean;
  }> {
    //const batchSize = metadata.batchSize ?? 50;
    const batchSize = 3; // FIXME: fix this after we have tested it enough
    const pendingIds = metadata.pendingContentIds ?? [];

    if (pendingIds.length > 0) {
      const idsToProcess = pendingIds.slice(0, batchSize);
      const rows = await this.fetchByIds(workspaceId, idsToProcess);

      const rowsById = new Map(rows.map((row) => [row.id, row]));
      const targets: ContentMetricsTarget[] = [];
      const missing: string[] = [];

      for (const id of idsToProcess) {
        const row = rowsById.get(id);
        if (row) {
          targets.push(this.toTarget(row));
        } else {
          missing.push(id);
        }
      }

      if (missing.length > 0) {
        log.warn("pending content missing in metrics batch", {
          workspaceId,
          missing,
        });
      }

      const remainingPendingIds = pendingIds
        .slice(idsToProcess.length)
        .filter((id) => !missing.includes(id));

      return {
        targets,
        nextCursor: metadata.cursor ?? null,
        remainingPendingIds: remainingPendingIds.length
          ? remainingPendingIds
          : undefined,
        exhausted: false,
      };
    }

    const rows = await this.fetchAfterCursor(
      workspaceId,
      metadata.cursor ?? null,
      batchSize,
    );

    if (rows.length === 0) {
      return {
        targets: [],
        nextCursor: null,
        exhausted: true,
      };
    }

    const nextCursor =
      rows.length === batchSize ? rows[rows.length - 1].id : null;
    const exhausted = rows.length < batchSize;

    return {
      targets: rows.map((row) => this.toTarget(row)),
      nextCursor,
      exhausted,
    };
  }

  private async fetchByIds(workspaceId: string, ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return await db()
      .select({
        id: unifiedContentTable.id,
        placement: unifiedContentTable.placement,
        sourceContentId: unifiedContentTable.sourceContentId,
        connectedAccountId: unifiedContentTable.connectedAccountId,
      })
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          inArray(unifiedContentTable.id, ids),
          eq(unifiedContentTable.publishingStatus, "PUBLISHED"),
        ),
      )
      .execute();
  }

  private async fetchAfterCursor(
    workspaceId: string,
    cursor: string | null,
    limit: number,
  ) {
    const baseCondition = and(
      eq(unifiedContentTable.workspaceId, workspaceId),
      eq(unifiedContentTable.publishingStatus, "PUBLISHED"),
    );

    const whereClause = cursor
      ? and(baseCondition, gt(unifiedContentTable.id, cursor))
      : baseCondition;

    return await db()
      .select({
        id: unifiedContentTable.id,
        placement: unifiedContentTable.placement,
        sourceContentId: unifiedContentTable.sourceContentId,
        connectedAccountId: unifiedContentTable.connectedAccountId,
      })
      .from(unifiedContentTable)
      .where(whereClause)
      .orderBy(asc(unifiedContentTable.id))
      .limit(limit)
      .execute();
  }

  private toTarget(row: {
    id: string;
    placement: ContentMetricsTarget["placement"];
    sourceContentId: string | null;
    connectedAccountId: string | null;
  }): ContentMetricsTarget {
    return {
      id: row.id,
      placement: row.placement,
      sourceContentId: row.sourceContentId,
      connectedAccountId: row.connectedAccountId,
    };
  }
}
