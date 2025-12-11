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

const log = Log.create({ namespace: "tiktok-publisher-router" });

/**
 * Router that determines which TikTok publisher to use based on the connected account type
 *
 * Note: Since 2025-12-10, all TikTok accounts should use BUSINESS_LOGIN.
 * The DEVELOPER_OAUTH is deprecated but supported for backward compatibility.
 * The ADVERTISER type is not yet implemented.
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

    // Default to Business API publisher for all supported types
    if (authType === "BUSINESS_LOGIN" || authType === "DEVELOPER_OAUTH") {
      if (authType === "DEVELOPER_OAUTH") {
        log.warn(
          "Using deprecated TikTok DEVELOPER_OAUTH - please migrate to BUSINESS_LOGIN",
          {
            contentId: pendingContentID,
            authType,
          },
        );
      }

      const publisher = new TikTokBusinessPublisher();
      return await publisher.publish(ctx, step, pendingContentID);
    }

    if (authType === "ADVERTISER") {
      throw new WorkflowError(
        `TikTok ADVERTISER auth type is not yet implemented for content ${pendingContentID}`,
      );
    }

    throw new WorkflowError(
      `Unsupported TikTok auth type: ${authType} for content ${pendingContentID}`,
    );
  }
}
