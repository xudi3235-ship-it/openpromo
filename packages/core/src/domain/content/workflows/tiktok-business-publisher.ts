import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import { TikTokBusinessAPIClient } from "@core/domain/content/entity/tiktok/business-api-client";
import { ensureTikTokBusinessUrlPrefixVerified } from "@core/domain/content/entity/tiktok/business-property-manager";
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
      publishStatus = await this.publishPhoto(step, pendingContentID);
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

    await step.do("post tiktok first comment", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.postFirstComment(publishedPostId ?? publishStatus.publish_id);
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

    // 1. check video
    await step.do("load tiktok business video content", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      c.assertReadyForVideoPublishing();
    });

    // 2. prepare video attachment
    const videoAttachment = await step.do(
      "prepare video attachment",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const attachment = c.ensureSingleVideoAttachment();
        return attachment;
      },
    );

    if (!videoAttachment.presignedUrl) {
      throw new WorkflowError(
        `TikTok video attachment ${videoAttachment.id} missing presignedUrl`,
      );
    }

    // 3. ensure video available on business verified domain
    const verifiedVideoUrl = await step.do(
      "ensure video available on business verified domain",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const verifiedClient = await TikTokBusinessAPIClient.forPlacementSpec(
          c.spec,
        );
        await ensureTikTokBusinessUrlPrefixVerified(verifiedClient);
        const { url } = await c.ensureVideoAvailableOnTikTokBusinessDomain(
          {
            id: videoAttachment.id,
            presignedUrl: videoAttachment.presignedUrl as string,
            mimeType: videoAttachment.mimeType,
          },
          verifiedClient.identity.businessId,
        );
        return url;
      },
    );
    // 4. publish video via business api
    const { shareId } = await step.do(
      "publish video via business api",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const client = await TikTokBusinessAPIClient.forPlacementSpec(c.spec);
        log.info("Publishing video via Business API", {
          businessId: client.identity.businessId,
          videoUrl: verifiedVideoUrl,
        });
        const options = c.getBusinessOptions();
        return await client.publishVideo({
          videoUrl: verifiedVideoUrl,
          caption: c.caption(),
          disableComment: options.disableComment,
          disableDuet: options.disableDuet,
          disableStitch: options.disableStitch,
          thumbnailOffset: options.thumbnailOffset,
          customThumbnailUrl: options.customThumbnailUrl,
          isBrandOrganic: false,
          isBrandedContent: false,
        });
      },
    );

    const finalStatus = await this.waitForPublishCompletion(
      step,
      pendingContentID,
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

  /**
   *
   * docs: https://business-api.tiktok.com/portal/docs?id=1803630424390658
   */
  private async publishPhoto(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<TikTokPublishStatusResult> {
    console.log("// publishTikTokFeedPhoto (Business API)");
    // 1. check photo
    await step.do("load tiktok business photo content", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      c.assertReadyForPhotoPublishing();
    });

    const preparedPhotos = await step.do(
      "ensure photos available on business verified domain",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const verifiedClient = await TikTokBusinessAPIClient.forPlacementSpec(
          c.spec,
        );
        await ensureTikTokBusinessUrlPrefixVerified(verifiedClient);
        return await c.ensurePhotosAvailableOnTikTokBusinessDomain(
          verifiedClient.identity.businessId,
        );
      },
    );

    console.log("prepared photos", preparedPhotos);

    const photoUrls = preparedPhotos.map((photo) => photo.url);
    if (photoUrls.length === 0) {
      throw new WorkflowError(
        `No prepared photo URLs found for TikTok content ${pendingContentID}`,
      );
    }

    // 2. publish photo via business api
    const { shareId } = await step.do(
      "publish photo via business api",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const client = await TikTokBusinessAPIClient.forPlacementSpec(c.spec);
        log.info("Publishing photo via Business API", {
          businessId: client.identity.businessId,
          photoCount: photoUrls.length,
        });
        const options = c.getBusinessOptions();
        const maxIndex = Math.max(photoUrls.length - 1, 0);
        // TODO: implement this photo cover feature??
        const photoCoverIndex = Math.min(
          Math.max(options.photoCoverIndex, 0),
          maxIndex,
        );
        return await client.publishPhoto({
          photoUrls,
          photoCoverIndex,
          caption: c.caption(),
          privacyLevel: options.privacyLevel,
          disableComment: options.disableComment,
          autoAddMusic: options.autoAddMusic,
          isBrandOrganic: false,
          isBrandedContent: false,
          isDraft: false,
        });
      },
    );

    const finalStatus = await this.waitForPublishCompletion(
      step,
      pendingContentID,
      shareId,
    );

    log.info("TikTok Business photo publish completed", {
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
    pendingContentID: string,
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
          const content =
            await EntTikTokFeedPendingContent.fromID(pendingContentID);
          const client = await TikTokBusinessAPIClient.forPlacementSpec(
            content.spec,
          );
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
