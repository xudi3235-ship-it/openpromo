import { WorkspaceContentMetricsRunner } from "./metrics-runner";
import type {
  RunTaskParams,
  TaskRunResult,
  WorkspaceSyncTaskRunner,
} from "./types";

export class WorkspaceSyncManager {
  private readonly runners: WorkspaceSyncTaskRunner[] = [
    new WorkspaceContentMetricsRunner(),
  ];

  async runTask(params: RunTaskParams): Promise<TaskRunResult> {
    const runner = this.runners.find((candidate) =>
      candidate.canRun(params.task),
    );

    if (!runner) {
      throw new Error(`No runner registered for task type ${params.task.type}`);
    }

    return runner.run(params);
  }
}
