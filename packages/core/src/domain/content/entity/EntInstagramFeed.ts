import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  IGFeedPlacementSpec,
  type PlacementSpec,
  type UnifiedContentSelect,
} from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import {
  buildAttachmentMetadata,
  mergeAttachmentMetadata,
} from "../attachments/metadata";
import { EntPendingContent } from "./EntContent";
import { InstagramMediaClient } from "./instagram/media-client";

const log = Log.create({ namespace: "instagram-feed-entity" });

/**
 * a pending instagram feed content. NOTE: feed = post + reel
 * seems like platforms are merging both.
 * ref: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
export class EntIGFeedPendingContent extends EntPendingContent {
  static type = "instagram_pending_content";
  spec: IGFeedPlacementSpec;
  igAccountID: string;
  constructor(data: UnifiedContentSelect) {
    super(data);
    const p = this.placement();
    if (p !== "IG_FEED") {
      throw new Error(`Content ${data.id} is not IG_FEED placement`);
    }
    const {
      data: spec,
      success,
      error,
    } = IGFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new Error(`Invalid placementSpec for content ${this.data.id}`);
    }
    if (!spec.identity.igAccountID) {
      throw new Error(
        `IG placementSpec missing igAccountID for content ${this.data.id}`,
      );
    }
    this.spec = spec;
    this.igAccountID = spec.identity.igAccountID;
  }
  static async fromID(id: string): Promise<EntIGFeedPendingContent> {
    return EntIGFeedPendingContent.fromPendingContent(
      await EntPendingContent.fromID(id),
    );
  }
  static fromPendingContent(c: EntPendingContent): EntIGFeedPendingContent {
    return new EntIGFeedPendingContent(c.data);
  }

  isSingleVideoReel() {
    // might expand, reels might support photos too
    return this.hasVideoAttachment() && this.onlyOneAttachment();
  }
  isPhotoCarousel() {
    return !this.onlyOneAttachment() && this.hasPhotoAttachment();
  }
  isSinglePhoto() {
    return this.hasPhotoAttachment() && this.onlyOneAttachment();
  }
  isMixedCarousel() {
    // mix of photo and video
    return (
      !this.onlyOneAttachment() &&
      this.hasPhotoAttachment() &&
      this.hasVideoAttachment()
    );
  }
  caption() {
    return this.spec.caption as string;
  }
  private async instagramClient(): Promise<InstagramMediaClient> {
    return InstagramMediaClient.forPlacementSpec(this.spec);
  }

  async syncAttachmentsFromInstagram(postId: string): Promise<void> {
    const localAttachments = this.attachments();
    if (localAttachments.length === 0) return;

    const client = await this.instagramClient();
    const remoteMedia = await client.fetchMedia(postId);
    const remoteRecords = client.mapRemoteMediaToAttachments(
      remoteMedia,
      localAttachments,
    );

    if (remoteRecords.length === 0) {
      log.warn("no remote media returned from instagram", { postId });
      return;
    }

    if (remoteRecords.length !== localAttachments.length) {
      log.warn("remote media count mismatch", {
        postId,
        remoteCount: remoteRecords.length,
        localCount: localAttachments.length,
      });
    }

    const remoteMetadataTasks: Array<Promise<unknown>> = [];

    const didUpdate = await this.updateAttachments(
      (attachment, index) => {
        const remote =
          remoteRecords[index] ?? remoteRecords[remoteRecords.length - 1];
        if (!remote) return attachment;
        const updated = { ...attachment } as typeof attachment;
        const existingMetadata =
          (attachment.metadata as Record<string, unknown> | undefined) ?? {};
        const nextMetadata: Record<string, unknown> = {
          ...existingMetadata,
        };
        let fieldChanged = false;
        let localAssetReplaced = false;

        if (nextMetadata.instagramMediaId !== remote.mediaId) {
          nextMetadata.instagramMediaId = remote.mediaId;
          fieldChanged = true;
        }

        if (nextMetadata.instagramMediaType !== remote.mediaType) {
          nextMetadata.instagramMediaType = remote.mediaType;
          fieldChanged = true;
        }

        const remotePrimaryUrl = remote.videoUrl ?? remote.imageUrl;

        if (remotePrimaryUrl) {
          if (updated.publicUrl !== remotePrimaryUrl) {
            updated.publicUrl = remotePrimaryUrl;
            fieldChanged = true;
            localAssetReplaced = true;
          }
          if (updated.presignedUrl) {
            updated.presignedUrl = undefined;
            fieldChanged = true;
            localAssetReplaced = true;
          }
          if (updated.s3Key) {
            updated.s3Key = undefined;
            fieldChanged = true;
            localAssetReplaced = true;
          }
          if (nextMetadata.instagramMediaUrl !== remotePrimaryUrl) {
            nextMetadata.instagramMediaUrl = remotePrimaryUrl;
            fieldChanged = true;
          }
        }

        if (
          remote.thumbnailUrl &&
          updated.thumbnailUrl !== remote.thumbnailUrl
        ) {
          updated.thumbnailUrl = remote.thumbnailUrl;
          fieldChanged = true;
          if (nextMetadata.instagramThumbnailUrl !== remote.thumbnailUrl) {
            nextMetadata.instagramThumbnailUrl = remote.thumbnailUrl;
            fieldChanged = true;
          }
        }

        const opMetadata = buildAttachmentMetadata({
          opLocalAssetDeletedAt: localAssetReplaced
            ? new Date().toISOString()
            : undefined,
          opRemotePlatform: "instagram",
          opRemoteAssetId: remote.mediaId,
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
        const primaryThumbnail =
          remoteRecords.find((record) => record.thumbnailUrl)?.thumbnailUrl ??
          remoteRecords[0]?.imageUrl ??
          spec.thumbnailUrl;

        if (primaryThumbnail && spec.thumbnailUrl !== primaryThumbnail) {
          return {
            ...spec,
            thumbnailUrl: primaryThumbnail,
          } satisfies PlacementSpec;
        }

        return spec;
      },
    );

    if (!didUpdate) {
      log.info("instagram attachments already up to date", { postId });
      return;
    }

    if (remoteMetadataTasks.length > 0) {
      await Promise.all(remoteMetadataTasks);
    }

    const parsed = IGFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (parsed.success) {
      this.spec = parsed.data;
    } else {
      log.warn("failed to refresh IG placement spec after attachment sync", {
        contentId: this.data.id,
        error: parsed.error?.message,
      });
    }
  }

  async fetchPermalinkUrl(postId: string): Promise<string | null> {
    try {
      const client = await this.instagramClient();
      const permalink = await client.fetchPermalink(postId);

      if (!permalink) {
        log.warn("instagram media missing permalink", {
          postId,
        });
      }

      return permalink;
    } catch (error) {
      log.warn("failed to fetch instagram permalink", {
        postId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  static async _createDummy(
    igAccountID: string,
  ): Promise<EntIGFeedPendingContent> {
    // not in use, just a placeholder
    const acc = await ConnectedAccount._createDummy();
    const content = await EntPendingContent.create({
      placement: "IG_FEED",
      connectedAccountId: acc.id,
      publishingStatus: "SCHEDULED",
      placementSpec: {
        customized: false,
        identity: {
          connectedAccountID: acc.id,
          igAccountID,
          metadata: {
            igAccountID,
          },
        },
        placement: "IG_FEED",
        caption: "dummy caption",
        attachments: [
          // {
          //   type: "photo",
          //   id: "your_mom",
          // },
          // {
          //   type: "photo",
          //   id: "your_mom_again",
          // },
          {
            type: "video",
            id: "your_mom_video",
            presignedUrl:
              "https://customer-ebwkk8kv75vt1wbh.cloudflarestream.com/0e859aa05d5af57db7b1d5888d6093ce/downloads/default.mp4",
          },
        ],
      },
    });
    return new EntIGFeedPendingContent(content);
  }
  async publisherType() {
    // determine
  }
}
