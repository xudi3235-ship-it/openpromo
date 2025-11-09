import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  FBFeedPlacementSpec,
  type PlacementSpec,
  type UnifiedContentSelect,
} from "@core/schemas/content.sql";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import {
  buildAttachmentMetadata,
  mergeAttachmentMetadata,
} from "../attachments/metadata";
import { EntPendingContent } from "./EntContent";
import { FacebookPageClient } from "./facebook/page-client";

const log = Log.create({ namespace: "facebook-feed-entity" });

/**
 * a pending facebook feed content.
 */
export class EntFBFeedPendingContent extends EntPendingContent {
  static type = "facebook_pending_content";
  spec: FBFeedPlacementSpec;
  pageID: string;
  constructor(data: UnifiedContentSelect) {
    super(data);
    const p = this.placement();
    if (p !== "FB_FEED") {
      throw new WorkflowError(
        `Content ${data.id} is not FB_FEED placement, got ${p}`,
      );
    }
    if (this.isPublished())
      throw new WorkflowError(`Content ${data.id} is already published`);
    const {
      data: spec,
      success,
      error,
    } = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new WorkflowError(
        `invalid FBFeedPlacementSpec for content ${data.id}: ${error}`,
      );
    }
    this.spec = spec;
    const pageID = spec.identity.fbPageID;
    if (!pageID) {
      throw new WorkflowError(`no pageID found for content ${this.data.id}`);
    }
    this.pageID = pageID;
  }

  static async fromID(id: string): Promise<EntFBFeedPendingContent> {
    return EntFBFeedPendingContent.fromPendingContent(
      await EntPendingContent.fromID(id),
    );
  }
  static fromPendingContent(c: EntPendingContent): EntFBFeedPendingContent {
    return new EntFBFeedPendingContent(c.data);
  }
  // helpers
  isTextOnlyPost() {
    const atts = this.spec.attachments ?? [];
    const msg = this.spec.postSpec.message;
    return atts.length === 0 && msg && msg.trim().length > 0;
  }
  isMultiPhotoPost() {
    const atts = this.spec.attachments ?? [];
    const photoCount = atts.filter((a) => a.type === "photo").length;
    return photoCount >= 1;
  }
  isSingleVideoPost() {
    const atts = this.spec.attachments ?? [];
    const videoCount = atts.filter((a) => a.type === "video").length;
    return videoCount === 1;
  }
  isCarouselPost() {
    // mix of photo and video
    const atts = this.spec.attachments ?? [];
    const photoCount = atts.filter((a) => a.type === "photo").length;
    const videoCount = atts.filter((a) => a.type === "video").length;
    return photoCount > 0 && videoCount > 0;
  }

  firstComment(): string | undefined {
    const comment = this.spec.firstComment;
    if (!comment) return undefined;
    const trimmed = comment.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async facebookClient(): Promise<FacebookPageClient> {
    return FacebookPageClient.forPlacementSpec(this.spec);
  }
  /**
   * we expose composable steps to create different types of posts.
   * Workflows should orchestrate these steps.
   */

  /**
   * requires a FB video in a ready state.
   * description, e.g. "What a beautiful day! #Tag"
   * ref: https://developers.facebook.com/docs/video-api/guides/reels-publishing/
   */

  async syncAttachmentsFromFacebook(postId: string): Promise<void> {
    const localAttachments = this.attachments();
    if (localAttachments.length === 0) return;

    const client = await this.facebookClient();
    const graphPostId = client.toGraphPostId(postId);

    const json = await client.fetchPostAttachments(graphPostId);
    const remoteMedia: Array<{
      imageSrc?: string;
      videoSource?: string;
      type?: string;
      videoId?: string;
    }> = [];

    const attachmentData = json.attachments?.data ?? [];

    type FacebookAttachmentData = (typeof attachmentData)[number];

    const collectRemote = (item: FacebookAttachmentData | undefined) => {
      if (!item) return;
      remoteMedia.push({
        imageSrc: item.media?.image?.src ?? undefined,
        videoSource: (item.media as { source?: string } | undefined)?.source,
        type: item.type,
      });
    };

    for (const attachment of attachmentData) {
      const subs = attachment.subattachments?.data;
      if (subs && subs.length > 0) {
        for (const sub of subs) {
          collectRemote(sub);
        }
      } else {
        collectRemote(attachment);
      }
    }

    if (remoteMedia.length === 0) {
      const videoId = await client.fetchVideoIdForPost(graphPostId);

      if (videoId) {
        const videoDetails = await client.fetchVideoDetails(videoId);

        const fallbackThumbnail = videoDetails.thumbnails?.data?.[0]?.uri;

        remoteMedia.push({
          type: "video",
          videoSource: videoDetails.source,
          imageSrc: fallbackThumbnail ?? undefined,
          videoId,
        });
      }

      if (remoteMedia.length === 0) {
        log.warn("no remote attachments returned from facebook", {
          postId: graphPostId,
        });
        return;
      }
    }

    const remoteMetadataTasks: Array<Promise<unknown>> = [];

    const didUpdate = await this.updateAttachments(
      (attachment, index) => {
        const remote = remoteMedia[index];
        if (!remote) return attachment;
        const updated = { ...attachment } as typeof attachment;
        const existingMetadata =
          (attachment.metadata as Record<string, unknown> | undefined) ?? {};
        const nextMetadata: Record<string, unknown> = { ...existingMetadata };
        let fieldChanged = false;
        let localAssetReplaced = false;

        if (nextMetadata.facebookPostId !== graphPostId) {
          nextMetadata.facebookPostId = graphPostId;
          fieldChanged = true;
        }

        if (remote.imageSrc) {
          if (updated.thumbnailUrl !== remote.imageSrc) {
            updated.thumbnailUrl = remote.imageSrc;
            fieldChanged = true;
          }
          if (updated.type === "photo") {
            if (updated.publicUrl !== remote.imageSrc) {
              updated.publicUrl = remote.imageSrc;
              fieldChanged = true;
            }
            if (updated.presignedUrl) {
              updated.presignedUrl = undefined;
              fieldChanged = true;
            }
            if (updated.s3Key) {
              updated.s3Key = undefined;
              fieldChanged = true;
            }
            if (nextMetadata.facebookImageUrl !== remote.imageSrc) {
              nextMetadata.facebookImageUrl = remote.imageSrc;
              fieldChanged = true;
            }
            localAssetReplaced = true;
          } else if (updated.type === "video") {
            if (nextMetadata.facebookVideoThumbnail !== remote.imageSrc) {
              nextMetadata.facebookVideoThumbnail = remote.imageSrc;
              fieldChanged = true;
            }
          }
        }

        if (remote.videoSource && updated.type === "video") {
          if (nextMetadata.facebookVideoSource !== remote.videoSource) {
            nextMetadata.facebookVideoSource = remote.videoSource;
            fieldChanged = true;
          }
          localAssetReplaced = true;
        }

        const opMetadata = buildAttachmentMetadata({
          opLocalAssetDeletedAt: localAssetReplaced
            ? new Date().toISOString()
            : undefined,
          opRemotePlatform: "facebook",
          opRemoteAssetId: remote.videoId ?? graphPostId,
          opUpdatedAt: new Date().toISOString(),
        });

        if (localAssetReplaced && attachment.id) {
          if (attachment.type === "photo") {
            remoteMetadataTasks.push(
              ImageStorage.setMetadata(attachment.id, opMetadata),
            );
          } else if (attachment.type === "video") {
            remoteMetadataTasks.push(
              VideoStorage.setMetadata(attachment.id, opMetadata),
            );
          }
        }

        const finalMetadata = mergeAttachmentMetadata(nextMetadata, opMetadata);
        const metadataChanged =
          JSON.stringify(finalMetadata) !== JSON.stringify(existingMetadata);

        if (!fieldChanged && !metadataChanged) {
          return attachment;
        }

        updated.metadata = finalMetadata;
        return updated;
      },
      (spec) => {
        const firstRemoteImage = remoteMedia.find(
          (media) => media.imageSrc,
        )?.imageSrc;
        if (firstRemoteImage && spec.thumbnailUrl !== firstRemoteImage) {
          return {
            ...spec,
            thumbnailUrl: firstRemoteImage,
          } satisfies PlacementSpec;
        }
        return spec;
      },
    );

    if (!didUpdate) {
      log.info("facebook attachments already up to date", {
        postId: graphPostId,
      });
      return;
    }

    if (remoteMetadataTasks.length > 0) {
      await Promise.all(remoteMetadataTasks);
    }

    const parsed = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (parsed.success) {
      this.spec = parsed.data;
    } else {
      log.warn("failed to refresh FB placement spec after attachment sync", {
        contentId: this.data.id,
        error: parsed.error?.message,
      });
    }
  }

  async postFirstComment(postId: string): Promise<void> {
    const comment = this.firstComment();
    if (!comment) return;
    try {
      const client = await this.facebookClient();
      await client.createComment(postId, comment);
      log.info("facebook first comment posted", { postId });
    } catch (error) {
      log.warn("failed to post facebook first comment", {
        postId,
        error: (error as Error).message,
      });
    }
  }
  async fetchPermalinkUrl(postId: string): Promise<string | null> {
    try {
      const client = await this.facebookClient();
      const graphPostId = client.toGraphPostId(postId);

      const url = await client.fetchPermalink(graphPostId);
      if (!url) {
        log.warn("facebook post missing permalink_url", {
          postId: graphPostId,
        });
      }
      return url ?? null;
    } catch (error) {
      log.warn("failed to fetch facebook permalink", {
        postId,
        error: (error as Error).message,
      });
      return null;
    }
  }
}
