import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { Storage } from "@core/helpers/storage";
import type {
  SharedAttachmentSpec,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import {
  TikTokFeedPlacementSpec,
  TikTokPlacement,
} from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { EntPendingContent } from "./pending-content";

export interface TikTokIdentityContext {
  accessToken: string;
  refreshToken?: string | null;
  tiktokUserID: string;
  connectedAccountID: string;
}

export class EntTikTokFeedPendingContent extends EntPendingContent {
  static type = "tiktok_pending_content";
  spec: TikTokFeedPlacementSpec;
  tiktokUserID: string;

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

  async identity(): Promise<TikTokIdentityContext> {
    const account = await ConnectedAccount.fromTikTokAccountID(
      this.tiktokUserID,
    );
    if (!account) {
      throw new WorkflowError(
        `connected account not found for TikTok user ${this.tiktokUserID}`,
      );
    }

    return {
      accessToken: account.encryptedAccessToken,
      refreshToken: account.refreshToken,
      tiktokUserID: this.tiktokUserID,
      connectedAccountID: account.id,
    } satisfies TikTokIdentityContext;
  }

  logContext() {
    return {
      contentId: this.data.id,
      tiktokUserID: this.tiktokUserID,
      connectedAccountID: this.spec.identity.connectedAccountID,
    };
  }

  assertReadyForPublishing() {
    const hasVideo = this.hasVideoAttachment();
    if (!hasVideo) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} must include a video attachment`,
      );
    }
    this.ensureSingleVideoAttachment();
  }

  async queryCreatorInfo(
    identity?: TikTokIdentityContext,
  ): Promise<Record<string, unknown>> {
    const ctx = identity ?? (await this.identity());
    const data = await this.tiktokPost<Record<string, unknown>>(
      ctx,
      "/v2/post/publish/creator_info/query/",
      {},
    );
    return data;
  }

  async initDirectPostFromUrl(
    identity: TikTokIdentityContext,
    params: TikTokDirectPostParams,
  ): Promise<{ publishId: string; uploadUrl?: string }> {
    if (!params.videoUrl || !/^https?:\/\//i.test(params.videoUrl)) {
      throw new WorkflowError("TikTok videoUrl must be an absolute URL");
    }

    const normalizedCaption = this.normalizeCaption(params.caption);
    const postInfoBase = this.buildPostInfo(normalizedCaption);

    const sourceInfo: TikTokDirectPostSourceInfo = {
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

    const payload: TikTokDirectPostInitPayload = {
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
    } satisfies TikTokDirectPostInitPayload;

    const data = await this.tiktokPost<TikTokVideoInitResponse>(
      identity,
      "/v2/post/publish/video/init/",
      payload,
    );

    const publishId = data.publish_id;
    if (!publishId) {
      throw new WorkflowError("TikTok video init response missing publish_id");
    }

    return {
      publishId,
      uploadUrl: data.upload_url,
    };
  }

  async fetchPublishStatus(
    identity: TikTokIdentityContext,
    publishId: string,
  ): Promise<TikTokPublishStatusResponse & TikTokPublishStatus> {
    const data = await this.tiktokPost<TikTokPublishStatusResponse>(
      identity,
      "/v2/post/publish/status/fetch/",
      {
        publish_id: publishId,
      },
    );

    const dataRecord = data as unknown as Record<string, unknown>;
    const message = data.message || dataRecord?.["status_msg"];
    const failReason = data.fail_reason || dataRecord?.["fail_msg"];

    return {
      ...data,
      shareUrl: data.share_url,
      failReason: typeof failReason === "string" ? failReason : undefined,
      message: typeof message === "string" ? message : undefined,
    } satisfies TikTokPublishStatusResponse & TikTokPublishStatus;
  }

  private async tiktokPost<T>(
    identity: TikTokIdentityContext,
    path: string,
    body: unknown,
  ): Promise<T> {
    const url = new URL(path, "https://open.tiktokapis.com");
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${identity.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new WorkflowError(
        `Failed to call TikTok API ${path}: ${(error as Error).message}`,
      );
    }

    let json: TikTokAPIResponse<T>;
    try {
      json = (await response.json()) as TikTokAPIResponse<T>;
    } catch (error) {
      throw new WorkflowError(
        `TikTok API ${path} returned invalid JSON: ${(error as Error).message}`,
      );
    }

    const apiError = json.error;
    const successCode =
      apiError?.code === undefined ||
      apiError?.code === null ||
      apiError?.code === "ok" ||
      apiError?.code === "success" ||
      apiError?.code === 0;

    if (!response.ok || !successCode) {
      const message =
        apiError?.message || response.statusText || `TikTok API ${path} failed`;
      log.warn("tiktok api error", {
        path,
        status: response.status,
        errorCode: apiError?.code,
        errorMessage: apiError?.message,
        log_id: apiError?.log_id,
      });
      throw new WorkflowError(message);
    }

    if (!json.data) {
      throw new WorkflowError(`TikTok API ${path} returned empty data`);
    }

    return json.data;
  }

  private buildPostInfo(caption?: string) {
    const sanitized = this.normalizeCaption(caption);
    if (!sanitized) throw new WorkflowError("TikTok caption cannot be empty");
    return {
      title: sanitized?.slice(0, 80),
      description: sanitized,
    } satisfies Pick<
      TikTokDirectPostInitPayload["post_info"],
      "title" | "description"
    >;
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
    const publicBucket = {
      name: "public",
      publicUrl: "https://bucket.openpromo.app",
    };

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

    return {
      key,
      url: Storage.publicUrl(key, publicBucket),
    };
  }
}
const log = Log.create({ namespace: "tiktok-feed-entity" });

type TikTokAPIError = {
  code?: string | number;
  message?: string;
  log_id?: string;
};

interface TikTokAPIResponse<T> {
  data?: T;
  error?: TikTokAPIError;
}

type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

interface TikTokVideoInitResponse {
  publish_id: string;
  upload_url?: string;
}

interface TikTokPublishStatusResponse {
  publish_id: string;
  status: string;
  post_id?: string;
  share_id?: string;
  share_url?: string;
  fail_reason?: string;
  message?: string;
}

export interface TikTokPublishStatus {
  status: string;
  shareUrl?: string;
  failReason?: string;
  message?: string;
}

export interface TikTokDirectPostParams {
  videoUrl: string;
  caption?: string;
  mimeType?: string;
  coverTimestampMs?: number;
  videoCoverTimestampsMs?: number[];
  privacyLevel?: TikTokPrivacyLevel;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  autoAddMusic?: boolean;
  allowAdvancedBoost?: boolean;
  mentionUserIds?: string[];
  brandedContentTag?: {
    business_partner_id: string;
    display_on_video: boolean;
  };
}

interface TikTokDirectPostSourceInfo {
  source: "PULL_FROM_URL" | "FILE_UPLOAD";
  video_url: string;
  video_format?: string;
  video_cover_timestamp_ms?: number[];
}

interface TikTokDirectPostInitPayload {
  post_info: {
    title: string;
    description?: string;
    privacy_level: TikTokPrivacyLevel;
    disable_comment: boolean;
    disable_duet: boolean;
    disable_stitch: boolean;
    auto_add_music: boolean;
    allow_advanced_boost: boolean;
    mention_user_ids?: string[];
    branded_content_tag?: TikTokDirectPostParams["brandedContentTag"];
  };
  source_info: TikTokDirectPostSourceInfo;
  post_mode: "DIRECT_POST";
  media_type: "VIDEO";
}
