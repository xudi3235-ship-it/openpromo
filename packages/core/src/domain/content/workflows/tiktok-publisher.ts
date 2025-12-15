/**
 * DEPRECATED: This publisher is deprecated since 2025-12-10.
 *
 * All TikTok content publishing now uses TikTokBusinessPublisher.
 * This file is kept for historical context and reference only.
 *
 * Migration: Replace usage with TikTokBusinessPublisher which uses the Business API
 * and provides enhanced features including comment management, business verification,
 * and improved publishing capabilities.
 */
import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import { TikTokDirectPostClient } from "@core/domain/content/entity/tiktok/direct-post-client";
import type { TikTokPublishStatusResult } from "@core/domain/content/entity/tiktok-feed";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";

const log = Log.create({ namespace: "tiktok-publisher" });

export class TikTokPublisher extends BasePublisher {
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

    log.info("TikTok content published", {
      postId: publishedPostId,
      contentId: pendingContentID,
      postType,
      shareUrl: publishStatus.shareUrl,
    });
  }

  private async publishPhoto(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<TikTokPublishStatusResult> {
    await step.do("validate tiktok photo context", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      c.assertReadyForPhotoPublishing();
    });

    const identity = await step.do(
      "resolve tiktok photo identity",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const client = await TikTokDirectPostClient.forPlacementSpec(c.spec);
        return client.identity;
      },
    );
    console.log("resolved tiktok identity", identity);

    const preparedPhotos = await step.do(
      "ensure photos available on verified domain",
      async () => {
        const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
        return await c.ensurePhotosAvailableOnVerifiedDomain();
      },
    );

    console.log("prepared photos", preparedPhotos);

    const photoUrls = preparedPhotos.map((photo) => photo.url);
    if (photoUrls.length === 0) {
      throw new WorkflowError(
        `No prepared photo URLs found for TikTok content ${pendingContentID}`,
      );
    }

    await step.do("query tiktok photo creator info", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      const client = await TikTokDirectPostClient.forPlacementSpec(c.spec);
      const info = await client.queryCreatorInfo();
      console.log("tiktok creator info", info);
      return info as Record<string, string | number | boolean>;
    });

    const photoCoverIndex = 0; // TODO: allow user to select cover photo

    const { publishId } = await step.do(
      "init tiktok photo publish",
      async () => {
        const content =
          await EntTikTokFeedPendingContent.fromID(pendingContentID);
        const client = await TikTokDirectPostClient.forPlacementSpec(
          content.spec,
        );
        console.log("init tiktok photo publish");
        return await content.initDirectPhotoPostFromUrls(client, {
          photoUrls,
          caption: content.caption(),
          privacyLevel: "SELF_ONLY",
          disableComment: false,
          autoAddMusic: true,
          allowAdvancedBoost: false,
          mentionUserIds: undefined,
          photoCoverIndex,
        });
      },
    );

    const finalStatus = await this.waitForPublishCompletion(
      step,
      pendingContentID,
      publishId,
    );

    log.info("TikTok photo publish completed", {
      publishId: finalStatus.publish_id,
    });
    return finalStatus;
  }

  private async publishVideo(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<TikTokPublishStatusResult> {
    console.log("// publishTikTokFeedVideo");

    // Load content and client once per workflow execution
    const content = await step.do("load tiktok video content", async () => {
      return await EntTikTokFeedPendingContent.fromID(pendingContentID);
    });

    const client = await step.do("load tiktok video client", async () => {
      return await TikTokDirectPostClient.forPlacementSpec(content.spec);
    });

    await step.do("validate tiktok video context", async () => {
      content.assertReadyForVideoPublishing();
    });

    const identity = await step.do(
      "resolve tiktok video identity",
      async () => {
        return client.identity;
      },
    );

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

    console.log("resolved tiktok identity", identity);

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

    await step.do("query tiktok video creator info", async () => {
      const info = await client.queryCreatorInfo();
      console.log("tiktok creator info", info);
      return info as Record<string, string | number | boolean>;
    });

    const { publishId } = await step.do(
      "init tiktok video publish",
      async () => {
        console.log("init tiktok video publish");
        return await content.initDirectVideoPostFromUrl(client, {
          videoUrl: verifiedVideoUrl,
          caption: content.caption(),
          mimeType: videoAttachment.mimeType,
          privacyLevel: "SELF_ONLY", // TODO: update this once app review is done
        });
      },
    );

    const finalStatus = await this.waitForPublishCompletion(
      step,
      pendingContentID,
      publishId,
    );

    log.info("TikTok video publish completed", {
      publishId: finalStatus.publish_id,
    });
    return finalStatus;
  }

  private async waitForPublishCompletion(
    step: CoreWorkflowStep,
    pendingContentID: string,
    publishId: string,
    maxAttempts = 20,
  ): Promise<TikTokPublishStatusResult> {
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      const status = await step.do(
        `fetch tiktok publish status (attempt ${attempt})`,
        async () => {
          const content =
            await EntTikTokFeedPendingContent.fromID(pendingContentID);
          const client = await TikTokDirectPostClient.forPlacementSpec(
            content.spec,
          );
          return await client.fetchPublishStatus(publishId);
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
}
