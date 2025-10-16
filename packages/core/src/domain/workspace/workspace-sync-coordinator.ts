import { DurableObject } from "cloudflare:workers";
import { WorkspaceSyncManager } from "@core/domain/workspace/sync";
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
  workspaceId: "workspaceId",
  tasks: "tasks",
} as const;

export type InitializeParams = {
  workspaceSlug: string;
  workspaceId: string;
};

export type InitializeResult = InitializeParams & {
  ok: true;
};

export type TaskResult = {
  task: WorkspaceSyncTask | null;
};

export type StatusResult = {
  workspaceSlug: string | null;
  workspaceId: string | null;
  tasks: WorkspaceSyncTask[];
};

export class WorkspaceSyncCoordinator extends DurableObject<ApiEnv> {
  private workspaceSlug: string | null = null;
  private workspaceId: string | null = null;
  private tasks: WorkspaceSyncTaskStore = {};
  private isLoaded = false;
  private readonly manager: WorkspaceSyncManager;

  constructor(state: DurableObjectState, env: ApiEnv) {
    super(state, env);
    this.manager = new WorkspaceSyncManager();
  }

  protected get storage() {
    return this.ctx.storage;
  }

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    await this.ensureLoaded();

    const { workspaceSlug, workspaceId } = params;

    if (!workspaceSlug) {
      throw new Error("workspaceSlug is required");
    }
    if (!workspaceId) {
      throw new Error("workspaceId is required");
    }

    if (!this.workspaceSlug) {
      this.workspaceSlug = workspaceSlug;
      await this.storage.put(STORAGE_KEYS.workspaceSlug, workspaceSlug);
    } else if (this.workspaceSlug !== workspaceSlug) {
      throw new Error("workspace slug mismatch");
    }

    if (!this.workspaceId) {
      this.workspaceId = workspaceId;
      await this.storage.put(STORAGE_KEYS.workspaceId, workspaceId);
    } else if (this.workspaceId !== workspaceId) {
      throw new Error("workspace id mismatch");
    }

    return {
      workspaceSlug: this.workspaceSlug,
      workspaceId: this.workspaceId,
      ok: true,
    };
  }

  async getStatus(): Promise<StatusResult> {
    await this.ensureLoaded();
    return {
      workspaceSlug: this.workspaceSlug,
      workspaceId: this.workspaceId,
      tasks: Object.values(this.tasks),
    };
  }

  async getTask(taskKey: string): Promise<TaskResult> {
    await this.ensureLoaded();
    return { task: this.tasks[taskKey] ?? null };
  }

  async listTasks(): Promise<WorkspaceSyncTask[]> {
    await this.ensureLoaded();
    return Object.values(this.tasks);
  }

  async runTask(taskKey: string): Promise<TaskResult> {
    await this.ensureLoaded();

    const task = this.tasks[taskKey];
    if (!task) {
      throw new Error(`Task ${taskKey} does not exist`);
    }

    const workspaceId = this.requireWorkspaceId();

    const { task: updatedTask } = await this.manager.runTask({
      taskKey,
      task,
      workspaceId,
    });

    this.tasks[taskKey] = updatedTask;
    await this.persistTasks();

    return { task: updatedTask };
  }

  async upsertTask(
    taskKey: string,
    patch: WorkspaceSyncTaskPatch = {},
  ): Promise<TaskResult> {
    await this.ensureLoaded();

    const existing = this.tasks[taskKey];
    const parsedPatch = parseWorkspaceSyncTaskPatch(patch);

    if (!existing) {
      this.tasks[taskKey] = createWorkspaceSyncTask({
        key: taskKey,
        metadata: parsedPatch.metadata,
        nextRunAt: parsedPatch.nextRunAt ?? undefined,
        lastTriggeredAt: parsedPatch.lastTriggeredAt ?? undefined,
      });
    } else {
      this.tasks[taskKey] = mergeWorkspaceSyncTask(existing, parsedPatch);
    }

    await this.persistTasks();

    return { task: this.tasks[taskKey] };
  }

  async triggerTask(taskKey: string): Promise<TaskResult> {
    return this.runTask(taskKey);
  }

  private async ensureLoaded() {
    if (this.isLoaded) {
      return;
    }

    const [storedSlug, storedWorkspaceId, storedTasks] = await Promise.all([
      this.storage.get<string>(STORAGE_KEYS.workspaceSlug),
      this.storage.get<string>(STORAGE_KEYS.workspaceId),
      this.storage.get<unknown>(STORAGE_KEYS.tasks),
    ]);

    this.workspaceSlug = storedSlug ?? null;
    this.workspaceId = storedWorkspaceId ?? null;

    const parsedTasks = WorkspaceSyncTaskStoreSchema.safeParse(
      storedTasks ?? {},
    );
    this.tasks = parsedTasks.success ? parsedTasks.data : {};
    this.isLoaded = true;
  }

  private async persistTasks() {
    await this.storage.put(STORAGE_KEYS.tasks, this.tasks);
  }

  private requireWorkspaceId(): string {
    if (!this.workspaceId) {
      throw new Error("workspace not initialized");
    }
    return this.workspaceId;
  }
}
