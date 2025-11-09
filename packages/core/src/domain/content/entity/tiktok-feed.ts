import { Storage } from "@core/helpers/storage";
import type {
  SharedAttachmentSpec,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import {
  type TikTokBusinessOptions,
  TikTokFeedPlacementSpec,
  TikTokPlacement,
} from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { EntPendingContent } from "./EntContent";
import { buildTikTokBusinessPrefixes } from "./tiktok/business-property-manager";
import {
  TikTokDirectPostClient,
  type TikTokIdentityContext,
  type TikTokPhotoDirectPostParams,
  type TikTokPrivacyLevel,
  type TikTokPublishStatusResult,
  type TikTokVideoDirectPostParams,
} from "./tiktok/direct-post-client";

export class EntTikTokFeedPendingContent extends EntPendingContent {
  static type = "tiktok_pending_content";
  spec: TikTokFeedPlacementSpec;
  tiktokUserID: string;
  private static readonly DEFAULT_BUSINESS_OPTIONS: Required<
    Pick<
      TikTokBusinessOptions,
      | "disableComment"
      | "disableDuet"
      | "disableStitch"
      | "autoAddMusic"
      | "photoCoverIndex"
      | "thumbnailOffset"
    >
  > & { privacyLevel: TikTokPrivacyLevel } = {
    disableComment: false,
    disableDuet: false,
    disableStitch: false,
    autoAddMusic: true,
    photoCoverIndex: 0,
    thumbnailOffset: 0,
    privacyLevel: "SELF_ONLY",
  };

  constructor(data: UnifiedContentSelect) {
    super(data);
    const placement = this.placement();
    if (placement !== TikTokPlacement.TT_FEED) {
      throw new WorkflowError(
        `Content ${data.id} is not TT_FEED placement, got ${placement}`,
      );
    }

    const parsed = TikTokFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!parsed.success) {
      throw new WorkflowError(
        `invalid TikTokFeedPlacementSpec for content ${data.id}: ${parsed.error.message}`,
      );
    }

    if (!parsed.data.identity.tiktokUserID) {
      throw new WorkflowError(
        `TikTok placement spec missing tiktokUserID for content ${data.id}`,
      );
    }

    this.spec = parsed.data;
    this.tiktokUserID = parsed.data.identity.tiktokUserID;
  }

  static async fromID(id: string): Promise<EntTikTokFeedPendingContent> {
    return EntTikTokFeedPendingContent.fromPendingContent(
      await EntPendingContent.fromID(id),
    );
  }

  static fromPendingContent(
    pendingContent: EntPendingContent,
  ): EntTikTokFeedPendingContent {
    return new EntTikTokFeedPendingContent(pendingContent.data);
  }

  caption(): string | undefined {
    return this.spec.caption ?? undefined;
  }

  ensureSingleVideoAttachment() {
    const videos = this.videoAttachments();
    if (videos.length !== 1) {
      throw new WorkflowError(
        `TikTok feed currently supports exactly one video attachment, found ${videos.length}`,
      );
    }
    return onlyOrThrow(videos);
  }

  private async tiktokClient(): Promise<TikTokDirectPostClient> {
    return TikTokDirectPostClient.forPlacementSpec(this.spec);
  }

  async identity(): Promise<TikTokIdentityContext> {
    const client = await this.tiktokClient();
    return client.identity;
  }

  logContext() {
    return {
      contentId: this.data.id,
      tiktokUserID: this.tiktokUserID,
      connectedAccountID: this.spec.identity.connectedAccountID,
    };
  }

  determinePostType(): "video" | "photo" {
    const hasVideo = this.hasVideoAttachment();
    const hasPhoto = this.hasPhotoAttachment();

    if (hasVideo && hasPhoto) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} cannot mix video and photo attachments`,
      );
    }

    if (hasVideo) return "video";
    if (hasPhoto) return "photo";

    throw new WorkflowError(
      `TikTok feed content ${this.data.id} requires either a video or photo attachment`,
    );
  }

  getBusinessOptions(): ResolvedTikTokBusinessOptions {
    const base = EntTikTokFeedPendingContent.DEFAULT_BUSINESS_OPTIONS;
    const options = this.spec.businessOptions ?? {};
    return {
      disableComment: options.disableComment ?? base.disableComment,
      disableDuet: options.disableDuet ?? base.disableDuet,
      disableStitch: options.disableStitch ?? base.disableStitch,
      autoAddMusic: options.autoAddMusic ?? base.autoAddMusic,
      privacyLevel: options.privacyLevel ?? base.privacyLevel,
      photoCoverIndex: options.photoCoverIndex ?? base.photoCoverIndex,
      thumbnailOffset: options.thumbnailOffset ?? base.thumbnailOffset,
      customThumbnailUrl:
        options.customThumbnailUrl ?? this.spec.thumbnailUrl ?? undefined,
    };
  }

  assertReadyForVideoPublishing() {
    const hasVideo = this.hasVideoAttachment();
    if (!hasVideo) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} must include a video attachment`,
      );
    }
    this.ensureSingleVideoAttachment();
  }

  assertReadyForPhotoPublishing() {
    if (this.hasVideoAttachment()) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} has a video attachment, expected only photos`,
      );
    }

    const photos = this.photosAttachments();
    if (photos.length === 0) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} must include at least one photo attachment`,
      );
    }

    for (const photo of photos) {
      if (!photo.publicUrl && !photo.presignedUrl) {
        throw new WorkflowError(
          `TikTok photo attachment ${photo.id ?? "unknown"} missing public or presigned URL`,
        );
      }
    }
  }

  async initDirectVideoPostFromUrl(
    client: TikTokDirectPostClient,
    params: TikTokVideoDirectPostParams,
  ): Promise<{ publishId: string; uploadUrl?: string }> {
    if (!params.videoUrl || !/^https?:\/\//i.test(params.videoUrl)) {
      throw new WorkflowError("TikTok videoUrl must be an absolute URL");
    }

    const normalizedCaption = this.normalizeCaption(params.caption);
    const postInfoBase = this.buildPostInfo(normalizedCaption);

    const sourceInfo: TikTokVideoDirectPostSourceInfo = {
      source: "PULL_FROM_URL",
      video_url: params.videoUrl,
    };

    if (params.mimeType) {
      sourceInfo.video_format = params.mimeType;
    }

    const coverTimestamps =
      params.videoCoverTimestampsMs?.filter(
        (ms) => Number.isFinite(ms) && ms >= 0,
      ) ?? [];
    if (
      typeof params.coverTimestampMs === "number" &&
      params.coverTimestampMs >= 0
    ) {
      coverTimestamps.push(params.coverTimestampMs);
    }
    if (coverTimestamps.length > 0) {
      sourceInfo.video_cover_timestamp_ms = coverTimestamps;
    }

    const mentionUserIds = params.mentionUserIds
      ?.map((id) => id.trim())
      .filter((id) => id.length > 0);

    const payload: TikTokVideoDirectPostInitPayload = {
      post_info: {
        ...postInfoBase,
        privacy_level: params.privacyLevel ?? "PUBLIC_TO_EVERYONE",
        disable_comment: params.disableComment ?? false,
        disable_duet: params.disableDuet ?? false,
        disable_stitch: params.disableStitch ?? false,
        auto_add_music: params.autoAddMusic ?? true,
        allow_advanced_boost: params.allowAdvancedBoost ?? false,
        mention_user_ids: mentionUserIds,
        branded_content_tag: params.brandedContentTag,
      },
      source_info: sourceInfo,
      post_mode: "DIRECT_POST",
      media_type: "VIDEO",
    } satisfies TikTokVideoDirectPostInitPayload;

    const result = await client.initVideoPost(payload);
    console.log({
      initPublishId: result.publishId,
      uploadUrl: result.uploadUrl,
    });
    return result;
  }

  async ensurePhotosAvailableOnVerifiedDomain(): Promise<
    { id: string; key: string; url: string }[]
  > {
    const photos = this.photosAttachments();
    if (photos.length === 0) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} has no photo attachments to prepare`,
      );
    }

    const prepared: { id: string; key: string; url: string }[] = [];
    const publicBucket = Storage.PUBLIC_BUCKET;

    for (const photo of photos) {
      const sourceUrl = photo.publicUrl ?? photo.presignedUrl;
      if (!sourceUrl) {
        throw new WorkflowError(
          `TikTok photo attachment ${photo.id ?? "unknown"} missing source URL`,
        );
      }

      const key = Storage.Key.daily(`tiktok-photo-${this.data.id}-${photo.id}`);

      const exists = await Storage.exists(key, publicBucket).catch((error) => {
        log.warn("failed to check existing TikTok photo object", {
          key,
          error,
        });
        return false;
      });

      if (!exists) {
        const response = await fetch(sourceUrl);
        if (!response.ok || !response.body) {
          throw new WorkflowError(
            `Failed to fetch photo ${photo.id ?? "unknown"} for TikTok upload: ${response.status} ${response.statusText}`,
          );
        }

        const contentType =
          photo.mimeType ||
          response.headers.get("content-type") ||
          "image/jpeg";

        await Storage.upload(
          key,
          response.body as ReadableStream<Uint8Array>,
          publicBucket,
          {
            contentType,
            metadata: {
              source: "cloudflare-images",
              attachmentId: photo.id,
              contentId: this.data.id,
            },
          },
        );
      }

      prepared.push({
        id: photo.id,
        key,
        url: Storage.publicUrl(key, publicBucket),
      });

      await this.updateAttachments((attachment) => {
        if (attachment.type !== "photo" || attachment.id !== photo.id) {
          return attachment;
        }

        const metadata = {
          ...(attachment.metadata as Record<string, unknown> | undefined),
        };
        const tiktokMeta = {
          ...((metadata?.tiktok as Record<string, unknown> | undefined) ?? {}),
          r2: {
            key,
            bucket: publicBucket.name,
          },
        } satisfies Record<string, unknown>;

        return {
          ...attachment,
          metadata: {
            ...metadata,
            tiktok: tiktokMeta,
          },
        } satisfies SharedAttachmentSpec;
      });
    }

    return prepared;
  }

  async initDirectPhotoPostFromUrls(
    client: TikTokDirectPostClient,
    params: TikTokPhotoDirectPostParams,
  ): Promise<{ publishId: string }> {
    const photoUrls = params.photoUrls
      ?.map((url) => url.trim())
      .filter(Boolean);
    if (!photoUrls || photoUrls.length === 0) {
      throw new WorkflowError(
        "TikTok photo post requires at least one photo URL",
      );
    }

    const normalizedCaption = this.normalizeCaption(params.caption);
    const postInfoBase = this.buildPostInfo(normalizedCaption);

    console.log({ info: JSON.stringify(postInfoBase) });

    const payload: TikTokPhotoDirectPostInitPayload = {
      post_info: {
        ...postInfoBase,
        privacy_level: params.privacyLevel ?? "PUBLIC_TO_EVERYONE",
        disable_comment: params.disableComment ?? false,
        auto_add_music: params.autoAddMusic ?? true,
        allow_advanced_boost: params.allowAdvancedBoost ?? false,
        mention_user_ids: params.mentionUserIds,
        branded_content_tag: params.brandedContentTag,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: params.photoCoverIndex ?? 1,
        photo_images: photoUrls,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    } satisfies TikTokPhotoDirectPostInitPayload;

    return await client.initPhotoPost(payload);
  }

  async finalizeTikTokAttachments(
    status: TikTokPublishStatusResult,
  ): Promise<void> {
    const attachments = this.attachments();
    if (attachments.length === 0) return;

    const deleteTasks: Array<Promise<unknown>> = [];
    const shareUrl = status.shareUrl;

    await this.updateAttachments((attachment) => {
      if (!attachment?.id) return attachment;

      const metadata = {
        ...(attachment.metadata as Record<string, unknown> | undefined),
      };
      const existingTikTokMeta = (metadata?.tiktok ?? {}) as Record<
        string,
        unknown
      >;
      const tiktokMeta: Record<string, unknown> = { ...existingTikTokMeta };

      const r2Meta = tiktokMeta.r2 as
        | { key?: string; bucket?: string }
        | undefined;
      if (r2Meta?.key) {
        const bucket = r2Meta.bucket || "public";
        deleteTasks.push(
          Storage.deleteFile(r2Meta.key, bucket).catch((error) => {
            log.warn("failed to delete tiktok r2 asset", {
              key: r2Meta.key,
              bucket,
              error,
            });
          }),
        );
        delete tiktokMeta.r2;
        tiktokMeta.r2DeletedAt = new Date().toISOString();
      }

      const updatedAttachment: SharedAttachmentSpec = { ...attachment };

      if (shareUrl && updatedAttachment.thumbnailUrl !== shareUrl) {
        updatedAttachment.thumbnailUrl = shareUrl;
      }

      if (
        shareUrl &&
        updatedAttachment.type === "photo" &&
        updatedAttachment.publicUrl !== shareUrl
      ) {
        updatedAttachment.publicUrl = shareUrl;
      }

      tiktokMeta.publishId = status.publish_id;
      if (status.post_id) {
        tiktokMeta.postId = status.post_id;
      }
      if (shareUrl) {
        tiktokMeta.shareUrl = shareUrl;
      }

      updatedAttachment.metadata = {
        ...metadata,
        tiktok: tiktokMeta,
      } satisfies Record<string, unknown>;

      return updatedAttachment;
    });

    if (deleteTasks.length > 0) {
      await Promise.all(deleteTasks);
    }
  }

  private buildPostInfo(caption?: string) {
    const sanitized = this.normalizeCaption(caption);
    if (!sanitized) throw new WorkflowError("TikTok caption cannot be empty");
    return {
      title: sanitized?.slice(0, 80),
      description: sanitized,
    } satisfies TikTokBasePostInfo;
  }

  private normalizeCaption(caption?: string) {
    if (!caption) return undefined;
    const trimmed = caption.trim();
    // TikTok caption limit is 2200 characters
    return trimmed.slice(0, 2200);
  }

  async ensureVideoAvailableOnVerifiedDomain(
    video: Pick<SharedAttachmentSpec, "id" | "presignedUrl" | "mimeType">,
  ): Promise<{ key: string; url: string }> {
    if (!video.presignedUrl) {
      throw new WorkflowError("Video attachment missing presignedUrl");
    }

    const key = Storage.Key.daily(`tiktok-upload-${video.id}`);
    const publicBucket = Storage.PUBLIC_BUCKET;

    const exists = await Storage.exists(key, publicBucket);
    if (!exists) {
      // stream -> R2
      const response = await fetch(video.presignedUrl);
      if (!response.ok || !response.body) {
        throw new WorkflowError(
          `Failed to fetch video ${video.id} for TikTok upload: ${response.status} ${response.statusText}`,
        );
      }
      const contentType =
        video.mimeType || response.headers.get("content-type") || "video/mp4";
      await Storage.upload(
        key,
        response.body as ReadableStream<Uint8Array>,
        publicBucket,
        {
          contentType,
          metadata: {
            source: "cloudflare-stream",
            attachmentId: video.id,
            contentId: this.data.id,
          },
        },
      );
    }

    await this.updateAttachments((attachment) => {
      if (attachment.type !== "video" || attachment.id !== video.id) {
        return attachment;
      }

      const metadata = {
        ...(attachment.metadata as Record<string, unknown> | undefined),
      };
      const tiktokMeta = {
        ...((metadata?.tiktok as Record<string, unknown> | undefined) ?? {}),
        r2: {
          key,
          bucket: publicBucket.name,
        },
      } satisfies Record<string, unknown>;

      return {
        ...attachment,
        metadata: {
          ...metadata,
          tiktok: tiktokMeta,
        },
      } satisfies SharedAttachmentSpec;
    });

    return {
      key,
      url: Storage.publicUrl(key, publicBucket),
    };
  }

  async ensureVideoAvailableOnTikTokBusinessDomain(
    video: Pick<SharedAttachmentSpec, "id" | "presignedUrl" | "mimeType">,
    businessAccountId: string,
  ): Promise<{ key: string; url: string }> {
    if (!video.presignedUrl) {
      throw new WorkflowError("Video attachment missing presignedUrl");
    }

    const { keyPrefix } = buildTikTokBusinessPrefixes(businessAccountId);
    const extension = video.mimeType?.split("/")?.[1]?.split("+")?.[0] || "mp4";
    const key = `${keyPrefix}videos/${this.data.id}-${video.id}.${extension}`;
    const publicBucket = Storage.PUBLIC_BUCKET;

    const exists = await Storage.exists(key, publicBucket).catch((error) => {
      log.warn("failed to check existing TikTok Business video object", {
        key,
        error,
      });
      return false;
    });

    if (!exists) {
      const response = await fetch(video.presignedUrl);
      if (!response.ok || !response.body) {
        throw new WorkflowError(
          `Failed to fetch video ${video.id} for TikTok Business upload: ${response.status} ${response.statusText}`,
        );
      }
      const contentType =
        video.mimeType || response.headers.get("content-type") || "video/mp4";

      await Storage.upload(
        key,
        response.body as ReadableStream<Uint8Array>,
        publicBucket,
        {
          contentType,
          metadata: {
            source: "cloudflare-stream",
            attachmentId: video.id,
            contentId: this.data.id,
            tiktokBusinessAccount: businessAccountId,
          },
        },
      );
    }

    await this.updateAttachments((attachment) => {
      if (attachment.type !== "video" || attachment.id !== video.id) {
        return attachment;
      }

      const metadata = {
        ...(attachment.metadata as Record<string, unknown> | undefined),
      };
      const tiktokMeta = {
        ...((metadata?.tiktok as Record<string, unknown> | undefined) ?? {}),
        r2: {
          key,
          bucket: publicBucket.name,
        },
        business: {
          accountId: businessAccountId,
          keyPrefix,
        },
      } satisfies Record<string, unknown>;

      return {
        ...attachment,
        metadata: {
          ...metadata,
          tiktok: tiktokMeta,
        },
      } satisfies SharedAttachmentSpec;
    });

    return {
      key,
      url: Storage.publicUrl(key, publicBucket),
    };
  }

  async ensurePhotosAvailableOnTikTokBusinessDomain(
    businessAccountId: string,
  ): Promise<{ id: string; key: string; url: string }[]> {
    const photos = this.photosAttachments();
    if (photos.length === 0) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} has no photo attachments to prepare`,
      );
    }

    const prepared: { id: string; key: string; url: string }[] = [];
    const { keyPrefix } = buildTikTokBusinessPrefixes(businessAccountId);
    const publicBucket = Storage.PUBLIC_BUCKET;

    for (const photo of photos) {
      const sourceUrl = photo.publicUrl ?? photo.presignedUrl;
      if (!sourceUrl) {
        throw new WorkflowError(
          `TikTok photo attachment ${photo.id ?? "unknown"} missing source URL`,
        );
      }

      const key = `${keyPrefix}photos/${this.data.id}-${photo.id}`;

      const exists = await Storage.exists(key, publicBucket).catch((error) => {
        log.warn("failed to check existing TikTok Business photo object", {
          key,
          error,
        });
        return false;
      });

      if (!exists) {
        const response = await fetch(sourceUrl);
        if (!response.ok || !response.body) {
          throw new WorkflowError(
            `Failed to fetch photo ${photo.id ?? "unknown"} for TikTok Business upload: ${response.status} ${response.statusText}`,
          );
        }

        const contentType =
          photo.mimeType ||
          response.headers.get("content-type") ||
          "image/jpeg";

        await Storage.upload(
          key,
          response.body as ReadableStream<Uint8Array>,
          publicBucket,
          {
            contentType,
            metadata: {
              source: "cloudflare-images",
              attachmentId: photo.id,
              contentId: this.data.id,
              tiktokBusinessAccount: businessAccountId,
            },
          },
        );
      }

      prepared.push({
        id: photo.id,
        key,
        url: Storage.publicUrl(key, publicBucket),
      });

      await this.updateAttachments((attachment) => {
        if (attachment.type !== "photo" || attachment.id !== photo.id) {
          return attachment;
        }

        const metadata = {
          ...(attachment.metadata as Record<string, unknown> | undefined),
        };
        const tiktokMeta = {
          ...((metadata?.tiktok as Record<string, unknown> | undefined) ?? {}),
          r2: {
            key,
            bucket: publicBucket.name,
          },
          business: {
            accountId: businessAccountId,
            keyPrefix,
          },
        } satisfies Record<string, unknown>;

        return {
          ...attachment,
          metadata: {
            ...metadata,
            tiktok: tiktokMeta,
          },
        } satisfies SharedAttachmentSpec;
      });
    }

    return prepared;
  }
}

type ResolvedTikTokBusinessOptions = {
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  autoAddMusic: boolean;
  privacyLevel: TikTokPrivacyLevel;
  photoCoverIndex: number;
  thumbnailOffset: number;
  customThumbnailUrl?: string;
};
const log = Log.create({ namespace: "tiktok-feed-entity" });

export type {
  TikTokIdentityContext,
  TikTokPhotoDirectPostParams,
  TikTokPrivacyLevel,
  TikTokPublishStatus,
  TikTokPublishStatusResult,
  TikTokVideoDirectPostParams,
} from "./tiktok/direct-post-client";

type TikTokBasePostInfo = {
  title: string;
  description?: string;
};

interface TikTokVideoDirectPostSourceInfo {
  source: "PULL_FROM_URL" | "FILE_UPLOAD";
  video_url: string;
  video_format?: string;
  video_cover_timestamp_ms?: number[];
}

interface TikTokPhotoDirectPostSourceInfo {
  source: "PULL_FROM_URL";
  photo_images: string[];
  photo_cover_index?: number;
}

interface TikTokVideoDirectPostInitPayload {
  post_info: TikTokBasePostInfo & {
    privacy_level: TikTokPrivacyLevel;
    disable_comment: boolean;
    disable_duet: boolean;
    disable_stitch: boolean;
    auto_add_music: boolean;
    allow_advanced_boost: boolean;
    mention_user_ids?: string[];
    branded_content_tag?: TikTokVideoDirectPostParams["brandedContentTag"];
  };
  source_info: TikTokVideoDirectPostSourceInfo;
  post_mode: "DIRECT_POST";
  media_type: "VIDEO";
}

interface TikTokPhotoDirectPostInitPayload {
  post_info: TikTokBasePostInfo & {
    privacy_level: TikTokPrivacyLevel;
    disable_comment: boolean;
    auto_add_music: boolean;
    allow_advanced_boost: boolean;
    mention_user_ids?: string[];
    branded_content_tag?: TikTokPhotoDirectPostParams["brandedContentTag"];
  };
  source_info: TikTokPhotoDirectPostSourceInfo;
  post_mode: "DIRECT_POST";
  media_type: "PHOTO";
}
