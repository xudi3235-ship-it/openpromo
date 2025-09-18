import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "instagram-common" });

export async function waitForVideoContainer(
  step: CoreWorkflowStep,
  pendingContentID: string,
  containerId: string,
  index: number,
  attempt: number = 1,
): Promise<void> {
  if (attempt > 10) {
    throw new Error(
      `Video container ${containerId} at index ${index} not ready after ${attempt} attempts, giving up`,
    );
  }

  const status = await step.do(
    `check video container ${containerId} status`,
    async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      return await c.getMediaContainerStatus(containerId);
    },
  );

  console.log("// video container status", { containerId, status });

  if (status.status_code === "FINISHED") {
    log.info(`video container ${containerId} at index ${index} is ready`);
    return;
  }

  if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
    throw new Error(
      `Video container ${containerId} at index ${index} failed with status: ${status.status_code}`,
    );
  }

  if (status.status_code === "IN_PROGRESS") {
    await step.sleep(`wait for video ${containerId} processing`, 60 * 1000);
    return await waitForVideoContainer(
      step,
      pendingContentID,
      containerId,
      index,
      attempt + 1,
    );
  }

  throw new Error(
    `Unknown status for video container ${containerId}: ${status.status_code}`,
  );
}
