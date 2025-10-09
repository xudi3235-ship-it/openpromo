import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  TikTokIdentityContext,
  TikTokPublishStatusResult,
} from "@core/domain/content/entity/tiktok-feed";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "tiktok-publish-status" });

export interface WaitForPublishOptions {
  maxAttempts?: number;
}

export async function waitForTikTokPublishCompletion(
  step: CoreWorkflowStep,
  pendingContentID: string,
  identity: TikTokIdentityContext,
  publishId: string,
  options: WaitForPublishOptions = {},
): Promise<TikTokPublishStatusResult> {
  const maxAttempts = options.maxAttempts ?? 20;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    const status = await step.do(
      `fetch tiktok publish status (attempt ${attempt})`,
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        return await c.fetchPublishStatus(identity, publishId);
      },
    );

    console.log("status:", JSON.stringify(status));

    log.info("tiktok publish status", {
      publishId,
      status: status.status,
      attempt,
    });

    if (status.status === "PUBLISH_COMPLETE") {
      return status;
    }

    if (status.status === "FAILED") {
      const reason = status.failReason || status.message || "unknown";
      throw new WorkflowError(
        `TikTok publish failed for ${publishId}: ${reason}`,
      );
    }

    await step.sleep(
      `wait for tiktok publish status (attempt ${attempt})`,
      Math.min(30_000, attempt * 2_000),
    );
  }

  throw new WorkflowError(
    `Timed out waiting for TikTok publish status for ${publishId}`,
  );
}
