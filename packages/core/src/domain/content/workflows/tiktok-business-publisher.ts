import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import { TikTokBusinessAPIClient } from "@core/domain/content/entity/tiktok/business-api-client";
import type { TikTokPublishStatusResult } from "@core/domain/content/entity/tiktok-feed";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";

const log = Log.create({ namespace: "tiktok-business-publisher" });

/**
 * Publisher for TikTok Business API v1.3 (BUSINESS_LOGIN accounts)
 */
export class TikTokBusinessPublisher extends BasePublisher {
  async publish(
    _ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    const postType = await step.do("determine tiktok post type", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      return c.determinePostType();
    });

    let publishStatus: TikTokPublishStatusResult;
    if (postType === "video") {
      await this.prepareVideosIfNeeded(step, pendingContentID);
      publishStatus = await this.publishVideo(step, pendingContentID);
    } else if (postType === "photo") {
      throw new WorkflowError(
        "TikTok Business API photo publishing not yet implemented",
      );
    } else {
      throw new WorkflowError(
        `Unsupported TikTok post type for content ${pendingContentID}: ${postType}`,
      );
    }

    const publishedPostId =
      publishStatus.post_id ??
      publishStatus.publish_id ??
      publishStatus.share_id;

    await step.do("finalize tiktok assets", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.finalizeTikTokAttachments(publishStatus);
    });

    await step.do("mark tiktok content as published", async () => {
      console.log("// mark tiktok content as published");
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.markAsPublished(publishedPostId ?? publishStatus.publish_id, {
        permalinkUrl: publishStatus.shareUrl ?? undefined,
        shareUrl: publishStatus.shareUrl ?? undefined,
      });
    });

    log.info("TikTok Business content published", {
      postId: publishedPostId,
      contentId: pendingContentID,
      postType,
      shareUrl: publishStatus.shareUrl,
    });
  }

  private async publishVideo(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<TikTokPublishStatusResult> {
    console.log("// publishTikTokFeedVideo (Business API)");

    const content = await step.do("load tiktok video content", async () => {
      return await EntTikTokFeedPendingContent.fromID(pendingContentID);
    });

    const client = await step.do(
      "load tiktok business api client",
      async () => {
        return await TikTokBusinessAPIClient.forPlacementSpec(content.spec);
      },
    );

    await step.do("validate tiktok video context", async () => {
      content.assertReadyForVideoPublishing();
    });

    const videoAttachment = await step.do(
      "prepare video attachment",
      async () => {
        const attachment = content.ensureSingleVideoAttachment();
        return attachment;
      },
    );

    if (!videoAttachment.presignedUrl) {
      throw new WorkflowError(
        `TikTok video attachment ${videoAttachment.id} missing presignedUrl`,
      );
    }

    const verifiedVideoUrl = await step.do(
      "ensure video available on verified domain",
      async () => {
        const { url } = await content.ensureVideoAvailableOnVerifiedDomain({
          id: videoAttachment.id,
          presignedUrl: videoAttachment.presignedUrl as string,
          mimeType: videoAttachment.mimeType,
        });
        return url;
      },
    );

    const { shareId } = await step.do(
      "publish video via business api",
      async () => {
        log.info("Publishing video via Business API", {
          businessId: client.identity.businessId,
          videoUrl: verifiedVideoUrl,
        });
        return await client.publishVideo({
          videoUrl: verifiedVideoUrl,
          caption: content.caption(),
          disableComment: false,
          disableDuet: false,
          disableStitch: false,
          isBrandOrganic: false,
          isBrandedContent: false,
        });
      },
    );

    const finalStatus = await this.waitForPublishCompletion(
      step,
      client,
      shareId,
    );

    log.info("TikTok Business video publish completed", {
      shareId,
      postIds: finalStatus.post_ids,
    });

    // Convert Business API response to match TikTokPublishStatusResult
    return {
      publish_id: shareId,
      status: finalStatus.status,
      post_id: finalStatus.post_ids?.[0],
      share_id: shareId,
      share_url: undefined, // Business API doesn't return share_url in status
      fail_reason: finalStatus.reason,
      message: finalStatus.status,
      shareUrl: undefined,
      failReason: finalStatus.reason,
    };
  }

  private async waitForPublishCompletion(
    step: CoreWorkflowStep,
    client: TikTokBusinessAPIClient,
    publishId: string,
    maxAttempts = 20,
  ): Promise<
    import("@core/domain/content/entity/tiktok/business-api-client").TikTokBusinessPublishStatus
  > {
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      const status = await step.do(
        `fetch business publish status (attempt ${attempt})`,
        async () => {
          return await client.getPublishStatus(publishId);
        },
      );

      console.log("Business API status:", JSON.stringify(status));

      log.info("tiktok business publish status", {
        publishId,
        status: status.status,
        attempt,
        postIds: status.post_ids,
      });

      if (status.status === "PUBLISH_COMPLETE") {
        return status;
      }

      if (status.status === "FAILED") {
        const reason = status.reason || "unknown";
        throw new WorkflowError(
          `TikTok Business publish failed for ${publishId}: ${reason}`,
        );
      }

      if (status.status === "SEND_TO_USER_INBOX") {
        // Draft uploaded successfully
        return status;
      }

      await step.sleep(
        `wait for business publish status (attempt ${attempt})`,
        Math.min(30_000, attempt * 2_000),
      );
    }

    throw new WorkflowError(
      `Timed out waiting for TikTok Business publish status for ${publishId}`,
    );
  }
}
