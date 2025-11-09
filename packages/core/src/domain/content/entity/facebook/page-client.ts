import type { FBFeedPlacementSpec } from "@core/schemas/content.sql";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import {
  type FacebookIdentityContext,
  facebookGraphRequest,
  resolveFacebookIdentity,
} from "./api";

type FBVideoStatusResponse = {
  status: {
    video_status:
      | "error"
      | "expired"
      | "processing"
      | "ready"
      | "uploading"
      | "upload_failed"
      | "upload_complete";
    uploading_phase: {
      status: "complete" | "error" | "not_started" | "in_progress";
      bytes_transfered?: number;
      errors?: unknown;
      source_file_size?: number;
    };
    processing_phase: {
      status: "complete" | "error" | "not_started" | "in_progress";
      errors?: unknown;
    };
    publishing_phase: {
      status: "complete" | "error" | "not_started" | "in_progress";
      errors?: unknown;
      publish_status?: "draft" | "error" | "published" | "scheduled";
      publish_time?: number;
    };
    copyright_check_status: {
      status?: "in_progress" | "complete" | "error";
    };
  };
};

const log = Log.create({ namespace: "facebook-page-client" });

type AttachedMediaInput = Array<{ media_fbid: string }>;

export interface FacebookFeedPostResponse {
  postId: string;
  rawId: string;
}

export interface FacebookVideoUploadSession {
  videoId: string;
  uploadUrl: string;
}

export class FacebookPageClient {
  private constructor(private readonly ctx: FacebookIdentityContext) {}

  static async forPlacementSpec(
    spec: FBFeedPlacementSpec,
  ): Promise<FacebookPageClient> {
    const identity = await resolveFacebookIdentity(spec);
    return new FacebookPageClient(identity);
  }

  get pageID(): string {
    return this.ctx.pageID;
  }

  get accessToken(): string {
    return this.ctx.accessToken;
  }

  async createFeedPost(params: {
    message?: string | null;
    attachedMedia?: AttachedMediaInput;
    callToAction?: {
      type: string;
      value: { link: string };
    };
    published?: boolean;
  }): Promise<FacebookFeedPostResponse> {
    const body = new URLSearchParams();

    if (params.message) {
      body.set("message", params.message);
    }

    if (typeof params.published === "boolean") {
      body.set("published", params.published ? "true" : "false");
    }

    params.attachedMedia?.forEach((media, index) => {
      body.append(
        `attached_media[${index}]`,
        JSON.stringify({ media_fbid: media.media_fbid }),
      );
    });

    if (params.callToAction) {
      body.set(
        "call_to_action",
        JSON.stringify({
          type: params.callToAction.type,
          value: params.callToAction.value,
        }),
      );
      body.set("link", params.callToAction.value.link);
    }

    const response = await facebookGraphRequest<{ id?: string }>(
      this.ctx,
      `/${this.pageID}/feed`,
      {
        method: "POST",
        body,
      },
    );

    const rawId = response.id ?? null;
    const postId = this.normalizePostId(rawId);

    if (!rawId || !postId) {
      throw new WorkflowError("Facebook feed post response missing post ID");
    }

    log.info("created facebook feed post", { rawId, postId });
    return { rawId, postId };
  }

  async uploadPhoto(url: string): Promise<string> {
    const body = new URLSearchParams();
    body.set("url", url);
    body.set("published", "false");

    const response = await facebookGraphRequest<{ id?: string }>(
      this.ctx,
      `/${this.pageID}/photos`,
      {
        method: "POST",
        body,
      },
    );

    const photoId = response.id;
    if (!photoId) {
      throw new WorkflowError("Facebook photo upload response missing id");
    }

    log.info("uploaded facebook photo", { photoId });
    return photoId;
  }

  async startVideoUpload(): Promise<FacebookVideoUploadSession> {
    const body = new URLSearchParams();
    body.set("upload_phase", "start");

    const response = await facebookGraphRequest<{
      video_id?: string;
      upload_url?: string;
      id?: string;
    }>(this.ctx, `/${this.pageID}/video_reels`, {
      method: "POST",
      body,
    });

    const videoId = response.video_id;
    const uploadUrl = response.upload_url;

    if (!videoId || !uploadUrl) {
      throw new WorkflowError("Failed to start Facebook video upload session");
    }

    log.info("started facebook video upload session", {
      videoId,
      uploadUrl,
    });

    return { videoId, uploadUrl };
  }

  async uploadVideoToSession(
    uploadUrl: string,
    fileUrl: string,
  ): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${this.accessToken}`,
        file_url: fileUrl,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload video: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const json = (await response.json()) as {
      success?: boolean;
      message?: string;
    };

    const success = json.success ?? false;
    const message = json.message;

    if (!success) {
      throw new Error(
        `Facebook video upload reported failure${message ? `: ${message}` : ""}`,
      );
    }

    log.info("uploaded video to facebook session", { message });
    return { success, message };
  }

  async finishVideoUpload(params: {
    videoId: string;
    description: string;
    videoState?: "PUBLISHED" | "DRAFT";
  }): Promise<FacebookFeedPostResponse> {
    const body = new URLSearchParams();
    body.set("upload_phase", "finish");
    body.set("video_id", params.videoId);
    body.set("description", params.description);
    body.set("video_state", params.videoState ?? "PUBLISHED");

    const response = await facebookGraphRequest<{
      success?: boolean;
      post_id?: string;
      id?: string;
    }>(this.ctx, `/${this.pageID}/video_reels`, {
      method: "POST",
      body,
    });

    const rawId = response.post_id ?? response.id ?? null;
    const postId = this.normalizePostId(rawId);

    if (!rawId || !postId || response.success === false) {
      throw new WorkflowError(
        "Facebook video finish response indicates failure",
      );
    }

    log.info("finished facebook video upload", { rawId, postId });
    return { rawId, postId };
  }

  async getVideoStatus(
    videoId: string,
  ): Promise<FBVideoStatusResponse["status"]> {
    const response = await facebookGraphRequest<FBVideoStatusResponse>(
      this.ctx,
      `/${videoId}`,
      {
        searchParams: {
          fields: "status",
        },
      },
    );

    if (!response.status) {
      throw new WorkflowError("Facebook video status response missing status");
    }

    return response.status;
  }

  async isVideoUploadComplete(videoId: string): Promise<boolean> {
    const status = await this.getVideoStatus(videoId);
    return status.uploading_phase.status === "complete";
  }

  async isVideoPublishComplete(videoId: string): Promise<boolean> {
    const status = await this.getVideoStatus(videoId);

    const videoStatus = status.video_status;
    const publishingStatus = status.publishing_phase?.status;
    const publishState = status.publishing_phase?.publish_status;

    if (videoStatus === "ready") {
      return true;
    }

    if (publishingStatus === "complete" || publishState === "published") {
      return true;
    }

    if (status.processing_phase?.status === "error") {
      throw new Error(
        `video ${videoId} failed during processing: ${JSON.stringify(
          status.processing_phase.errors,
        )}`,
      );
    }

    if (
      videoStatus === "error" ||
      publishingStatus === "error" ||
      publishState === "error"
    ) {
      throw new Error(`video ${videoId} failed during publishing`);
    }

    return false;
  }

  async fetchPostAttachments(graphPostId: string) {
    return facebookGraphRequest<{
      attachments?: {
        data?: Array<{
          media?: {
            image?: { src?: string };
            source?: string;
          };
          type?: string;
          subattachments?: {
            data?: Array<{
              media?: {
                image?: { src?: string };
                source?: string;
              };
              type?: string;
            }>;
          };
        }>;
      };
    }>(this.ctx, `/${graphPostId}`, {
      searchParams: {
        fields:
          "attachments{media{image{src}},subattachments{data{media{image{src}}}}}",
      },
    });
  }

  async fetchVideoIdForPost(graphPostId: string): Promise<string | null> {
    const response = await facebookGraphRequest<
      { video_id?: string } | undefined
    >(this.ctx, `/${graphPostId}`, {
      searchParams: {
        fields: "video_id",
      },
    });

    return response?.video_id ?? null;
  }

  async fetchVideoDetails(videoId: string) {
    return facebookGraphRequest<{
      id?: string;
      source?: string;
      thumbnails?: { data?: Array<{ uri?: string }> };
    }>(this.ctx, `/${videoId}`, {
      searchParams: {
        fields: "id,source,thumbnails{uri}",
      },
    });
  }

  async fetchPermalink(graphPostId: string): Promise<string | null> {
    const response = await facebookGraphRequest<{ permalink_url?: string }>(
      this.ctx,
      `/${graphPostId}`,
      {
        searchParams: {
          fields: "permalink_url",
        },
      },
    );

    return response.permalink_url ?? null;
  }

  toGraphPostId(postId: string): string {
    return postId.includes("_") ? postId : `${this.pageID}_${postId}`;
  }

  async createComment(postId: string, message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed) return;
    const graphPostId = this.toGraphPostId(postId);
    const body = new URLSearchParams();
    body.set("message", trimmed);

    await facebookGraphRequest(this.ctx, `/${graphPostId}/comments`, {
      method: "POST",
      body,
    });

    log.info("posted facebook first comment", { graphPostId });
  }

  private normalizePostId(rawId: string | null | undefined): string | null {
    if (!rawId) return null;
    if (rawId.includes("_")) {
      const [, postId] = rawId.split("_");
      if (postId) return postId;
    }
    return rawId;
  }
}
