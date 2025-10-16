import { DurableObject } from "cloudflare:workers";
import type { ApiEnv } from "@core/helpers/api-env";
import {
  createWorkspaceSyncTask,
  mergeWorkspaceSyncTask,
  parseWorkspaceSyncTaskPatch,
  type WorkspaceSyncTask,
  type WorkspaceSyncTaskPatch,
  type WorkspaceSyncTaskStore,
  WorkspaceSyncTaskStoreSchema,
} from "@shared/workspace";

const STORAGE_KEYS = {
  workspaceSlug: "workspaceSlug",
  tasks: "tasks",
} as const;

export type InitializeResult = {
  workspaceSlug: string;
  ok: true;
};

export type TaskResult = {
  task: WorkspaceSyncTask | null;
};

export type StatusResult = {
  workspaceSlug: string | null;
  tasks: WorkspaceSyncTask[];
};

/**
 * WorkspaceSyncCoordinator is a workspace-scoped durable object that will
 * eventually coordinate background sync workloads (metrics refresh, backfill,
 * etc). RPC methods are intentionally simple so routes or background jobs can
 * orchestrate work without going through the DO's fetch handler.
 */
export class WorkspaceSyncCoordinator extends DurableObject<ApiEnv> {
  private workspaceSlug: string | null = null;
  private tasks: WorkspaceSyncTaskStore = {};
  private isLoaded = false;

  protected get storage() {
    return this.ctx.storage;
  }

  /**
   * Ensure we have workspace context persisted. Subsequent initialize calls
   * are idempotent to make it safe for callers to invoke before every task.
   */
  async initialize(workspaceSlug: string): Promise<InitializeResult> {
    await this.ensureLoaded();

    if (!workspaceSlug) {
      throw new Error("workspaceSlug is required");
    }

    if (!this.workspaceSlug) {
      this.workspaceSlug = workspaceSlug;
      await this.storage.put(STORAGE_KEYS.workspaceSlug, workspaceSlug);
    }

    return {
      workspaceSlug: this.workspaceSlug,
      ok: true,
    };
  }

  async getStatus(): Promise<StatusResult> {
    await this.ensureLoaded();
    return {
      workspaceSlug: this.workspaceSlug,
      tasks: Object.values(this.tasks),
    };
  }

  async getTask(taskKey: string): Promise<TaskResult> {
    await this.ensureLoaded();
    return {
      task: this.tasks[taskKey] ?? null,
    };
  }

  async listTasks(): Promise<WorkspaceSyncTask[]> {
    await this.ensureLoaded();
    return Object.values(this.tasks);
  }

  async upsertTask(
    taskKey: string,
    input: WorkspaceSyncTaskPatch = {},
  ): Promise<TaskResult> {
    await this.ensureLoaded();

    if (!taskKey) {
      throw new Error("taskKey is required");
    }

    const existing = this.tasks[taskKey];
    const patch = parseWorkspaceSyncTaskPatch(input);

    if (!existing) {
      const task = createWorkspaceSyncTask({
        key: taskKey,
        metadata: patch.metadata,
        nextRunAt: patch.nextRunAt ?? undefined,
        lastTriggeredAt: patch.lastTriggeredAt ?? undefined,
      });
      this.tasks[taskKey] = task;
    } else {
      this.tasks[taskKey] = mergeWorkspaceSyncTask(existing, patch);
    }

    await this.persistTasks();

    return { task: this.tasks[taskKey] };
  }

  /**
   * Record that a task has been dispatched. Future implementations will enqueue
   * work into queues or workflows. For now we only capture trigger timestamps.
   */
  async triggerTask(taskKey: string): Promise<TaskResult> {
    await this.ensureLoaded();

    if (!taskKey) {
      throw new Error("taskKey is required");
    }

    const now = Date.now();
    const existing = this.tasks[taskKey];

    if (!existing) {
      throw new Error(
        `Task ${taskKey} does not exist; upsert before triggering`,
      );
    }

    this.tasks[taskKey] = mergeWorkspaceSyncTask(existing, {
      lastTriggeredAt: now,
    });

    await this.persistTasks();

    return { task: this.tasks[taskKey] };
  }

  private async ensureLoaded() {
    if (this.isLoaded) {
      return;
    }

    const [storedSlug, storedTasks] = await Promise.all([
      this.storage.get<string>(STORAGE_KEYS.workspaceSlug),
      this.storage.get<unknown>(STORAGE_KEYS.tasks),
    ]);

    this.workspaceSlug = storedSlug ?? null;
    const parsedTasks = WorkspaceSyncTaskStoreSchema.safeParse(
      storedTasks ?? {},
    );
    this.tasks = parsedTasks.success ? parsedTasks.data : {};
    this.isLoaded = true;
  }

  private async persistTasks() {
    await this.storage.put(STORAGE_KEYS.tasks, this.tasks);
  }
}
