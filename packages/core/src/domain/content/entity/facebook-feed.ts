import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { db, eq } from "@core/helpers/db";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  FBFeedPlacementSpec,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { env } from "@core/utils/env";
import { WorkflowError } from "@core/utils/error";
import { FacebookAdsApi, Page, Photo } from "facebook-nodejs-business-sdk";
import { EntPendingContent } from "./pending-content";

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
      error?: {
        message: string;
      };
    };
    publishing_phase: {
      status: "complete" | "error" | "not_started" | "in_progress";
      error?: {
        message: string;
      };
      publish_status?: "draft" | "error" | "published" | "scheduled";
      publish_time?: number;
    };
  };
};

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
    const atts = this.spec.postSpec.attachments ?? [];
    const msg = this.spec.postSpec.message;
    return atts.length === 0 && msg && msg.trim().length > 0;
  }
  isMultiPhotoPost() {
    const atts = this.spec.postSpec.attachments ?? [];
    const photoCount = atts.filter((a) => a.type === "photo").length;
    return photoCount >= 1;
  }
  isSingleVideoPost() {
    const atts = this.spec.postSpec.attachments ?? [];
    const videoCount = atts.filter((a) => a.type === "video").length;
    return videoCount === 1;
  }
  isCarouselPost() {
    // mix of photo and video
    const atts = this.spec.postSpec.attachments ?? [];
    const photoCount = atts.filter((a) => a.type === "photo").length;
    const videoCount = atts.filter((a) => a.type === "video").length;
    return photoCount > 0 && videoCount > 0;
  }
  hasPhotoAttachment() {
    const atts = this.spec.postSpec.attachments ?? [];
    return atts.some((a) => a.type === "photo");
  }
  hasVideoAttachment() {
    const atts = this.spec.postSpec.attachments ?? [];
    return atts.some((a) => a.type === "video");
  }
  photoAttachments() {
    const atts = this.spec.postSpec.attachments ?? [];
    return atts.filter((a) => a.type === "photo");
  }
  videoAttachments() {
    const atts = this.spec.postSpec.attachments ?? [];
    return atts.filter((a) => a.type === "video");
  }
  async markAsPublished(publishedContentID: string): Promise<this> {
    const [newContent] = await db()
      .update(unifiedContentTable)
      .set({
        publishingStatus: "PUBLISHED",
        sourceContentId: publishedContentID,
      })
      .where(eq(unifiedContentTable.id, this.data.id))
      .returning();
    if (!newContent)
      throw new WorkflowError(
        `failed to mark content ${this.data.id} as published`,
      );
    this.data = newContent;
    return this;
  }
  /**
   * we expose composable steps to create different types of posts.
   * Workflows should orchestrate these steps.
   */
  async createTextPost(): Promise<this> {
    if (!this.isTextOnlyPost()) throw new WorkflowError("no text provided");
    const text = this.spec.postSpec.message;
    // 0. get page with scoped access token
    const { page } = await this.identity();
    // 1. create post
    const post = await page.createFeed([], {
      message: text,
    });
    // format: <page_id>_<post_id>
    const rawID = post.id;
    const postID = rawID?.split("_")[1];
    console.log({ rawID, postID });
    if (!rawID || !postID)
      throw new WorkflowError(
        `failed to create text post, no post ID returned`,
      );
    console.log("L168");
    return await this.markAsPublished(postID);
  }
  async createPhotoPost(): Promise<this> {
    // ref: https://developers.facebook.com/docs/graph-api/reference/page/photos/
    const { page } = await this.identity();
    if (!this.isMultiPhotoPost())
      throw new Error("no photo attachment provided");
    const photos = this.photoAttachments();
    // 1. create N unpublished photos
    // NOTE: ensure the ordering.
    const fbPhotos = await Promise.all(
      photos.map(async (p) => {
        const cdnUrl = await ImageStorage.getImageDeliveryUrl(p.id);
        const photo = await page.createPhoto([Photo.Fields.id], {
          url: cdnUrl,
          published: false, // unpulished, to be attached to post
        });
        return photo;
      }),
    );
    // 2. create post with attached photos
    const post = await page.createFeed([Page.Fields.id], {
      message: this.spec.postSpec.message,
      attached_media: fbPhotos.map((p) => ({ media_fbid: p.id })),
    });
    const postID = post.id?.split("_")[1] ?? null;
    if (!postID)
      throw new WorkflowError(
        `failed to create photo post, no post ID returned`,
      );
    return await this.markAsPublished(postID);
  }
  /**
   * video related methods. Involves upload session, polling until
   * encoding is ready, and then creating the reel.
   * ref: https://developers.facebook.com/docs/video-api/guides/reels-publishing
   */
  async initVideoUploadSession() {
    const { page } = await this.identity();
    const session = await page.createVideoReel([], {
      upload_phase: "start",
    });
    console.log("// created video upload session", session);
    return {
      session,
      //@ts-expect-error facebook sdk is missing these fields
      video_id: session.video_id as string,
      //@ts-expect-error facebook sdk is missing these fields
      upload_url: session.upload_url as string,
    };
  }
  async uploadInternalVideoToSession(uploadSessionUrl: string) {
    const videos = this.videoAttachments();
    if (videos.length !== 1) {
      throw new Error("only single video upload is supported");
    }
    const video = videos[0];
    // 0. get video CDN url from our CF stream service
    const res = await VideoStorage.createMP4Download(video.id);
    console.log("// got video download url", res);
    const { acc } = await this.identity();
    const cdnUrl = res?.default?.url ?? null;
    if (!cdnUrl) {
      throw new Error("failed to get video CDN url");
    }
    // 1. upload the video
    const response = await fetch(uploadSessionUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${acc.encryptedAccessToken}`,
        file_url: cdnUrl,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload video: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
    // 2. check if we got a success or not
    const uploadRes = (await response.json()) as {
      message: string;
      success: boolean;
    };
    if (!uploadRes.success) {
      throw new Error(`Video upload failed: ${uploadRes.message}`);
    }
    return uploadRes;
  }
  async isVideoUploadComplete(videoId: string) {
    const status = await this.getVideoStatus(videoId);
    return status.uploading_phase.status === "complete";
  }

  async getVideoStatus(videoId: string) {
    const { acc } = await this.identity();
    const res = await fetch(
      `https://graph.facebook.com/v23.0/${videoId}?fields=status&access_token=${acc.encryptedAccessToken}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to get video status: ${res.status} ${res.statusText} - ${errorText}`,
      );
    }
    const resJson = (await res.json()) as FBVideoStatusResponse;
    console.log("// video status", resJson);
    return resJson.status;
  }
  /**
   * requires a FB video in a ready state.
   * description, e.g. "What a beautiful day! #Tag"
   * ref: https://developers.facebook.com/docs/video-api/guides/reels-publishing/
   */
  async createReel(videoId: string) {
    const { page } = await this.identity();
    const description = this.spec.postSpec.message;
    if (!description) throw new Error("no description provided");
    // this actually kicks off publishing
    // it will be processed and published
    // it's a async step.
    const response = await page.createVideoReel(
      [], // fields
      {
        video_id: videoId,
        description: description,
        upload_phase: "finish",
        video_state: "PUBLISHED",
      },
    );
    console.log("// published reel", response);
    return response;
  }
  protected async api(accessToken: string) {
    return FacebookAdsApi.init(accessToken).setDebug(env.DEBUG === "true");
  }
  protected async identity() {
    const acc = await ConnectedAccount.fromFBPageID(this.pageID);
    if (!acc) throw new Error("no connected account found");
    const api = this.api(acc.encryptedAccessToken);
    const page = new Page(this.pageID, api);
    return { page, acc, api };
  }
}
