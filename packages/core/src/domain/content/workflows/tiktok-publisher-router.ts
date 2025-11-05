import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";
import { TikTokBusinessPublisher } from "./tiktok-business-publisher";
import { TikTokPublisher } from "./tiktok-publisher";

const log = Log.create({ namespace: "tiktok-publisher-router" });

/**
 * Router that determines which TikTok publisher to use based on the connected account type
 */
export class TikTokPublisherRouter extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    // Determine which publisher to use based on auth type
    const authType = await step.do("determine tiktok auth type", async () => {
      const content =
        await EntTikTokFeedPendingContent.fromID(pendingContentID);
      const connectedAccountID = content.spec.identity.connectedAccountID;

      if (!connectedAccountID) {
        throw new WorkflowError(
          "TikTok content missing connectedAccountID in placement spec",
        );
      }

      const account = await ConnectedAccount.fromID(connectedAccountID);
      log.info("Routing TikTok publish request", {
        contentId: pendingContentID,
        authType: account.tiktokAuthType,
        connectedAccountId: connectedAccountID,
      });

      return account.tiktokAuthType;
    });

    // Route to appropriate publisher
    if (authType === "BUSINESS_LOGIN") {
      const publisher = new TikTokBusinessPublisher();
      return await publisher.publish(ctx, step, pendingContentID);
    }

    if (authType === "DEVELOPER_OAUTH") {
      const publisher = new TikTokPublisher();
      return await publisher.publish(ctx, step, pendingContentID);
    }

    throw new WorkflowError(
      `Unsupported TikTok auth type: ${authType} for content ${pendingContentID}`,
    );
  }
}
