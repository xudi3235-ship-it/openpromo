import type { WorkspaceSyncTask } from "@shared/workspace";

export type RunTaskParams = {
  taskKey: string;
  task: WorkspaceSyncTask;
  workspaceId: string;
};

export type TaskRunResult = {
  task: WorkspaceSyncTask;
};

export interface WorkspaceSyncTaskRunner {
  canRun(task: WorkspaceSyncTask): boolean;
  run(params: RunTaskParams): Promise<TaskRunResult>;
}
