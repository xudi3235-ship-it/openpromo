import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { VideoStorage } from "@core/helpers/storage/video";
import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { env } from "@core/utils/env";
import { FacebookAdsApi, Page, Photo } from "facebook-nodejs-business-sdk";
import { FBFeedPlacementSpec } from "../schema/placement";
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
      throw new Error(`Content ${data.id} is not FB_FEED placement`);
    }
    const {
      data: spec,
      success,
      error,
    } = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new Error(`Invalid placementSpec for content ${this.data.id}`);
    }
    this.spec = spec;
    this.pageID = spec.identity.pageId;
  }
  static fromPendingContent(c: EntPendingContent): EntFBFeedPendingContent {
    return new EntFBFeedPendingContent(c.data);
  }
  /**
   * we expose composable steps to create different types of posts.
   * Workflows should orchestrate these steps.
   */
  async createTextPost() {
    const text = this.spec.postSpec.message;
    if (!text) throw new Error("no text provided");
    // 0. get page with scoped access token
    const { page } = await this.identity();
    // 1. create post
    const post = await page.createFeed([], {
      message: text,
    });
    console.log("// created post", post);
  }
  async createPhotoPost() {
    // ref: https://developers.facebook.com/docs/graph-api/reference/page/photos/
    // 0. read page access token
    const { page } = await this.identity();
    const photos =
      this.spec.postSpec.attachments?.filter((a) => a.type === "photo") ?? [];
    if (photos.length === 0) {
      throw new Error("no photo attachment provided");
    }
    // 1. create N unpublished photos
    // NOTE: ensure the ordering.
    const fbPhotos = await Promise.all(
      photos.map(async (_p) => {
        // fake it for now
        // const cdnUrl = await ImageStorage.getImageDeliveryUrl(p.id);
        const cdnUrl = "https://picsum.photos/200/300";
        const photo = await page.createPhoto([Photo.Fields.id], {
          url: cdnUrl,
          published: false,
        });
        return photo;
      }),
    );
    // 2. create post with attached photos
    const post = await page.createFeed([Page.Fields.id], {
      message: this.spec.postSpec.message,
      attached_media: fbPhotos.map((p) => ({ media_fbid: p.id })),
    });
    console.log("// created photo post", post);
    return post;
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
  async uploadInternalVideoToSession(
    internalVideoID: string,
    uploadSessionUrl: string,
  ) {
    // 0. get video CDN url from our CF stream service
    const res = await VideoStorage.createMP4Download(internalVideoID);
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
    // TODO: need to handle the page access token short-lived issue.
    // need a layer of robust token management.
    const acc = await ConnectedAccount.fromFBPageID(this.pageID);
    if (!acc) throw new Error("no connected account found");
    const api = this.api(acc.encryptedAccessToken);
    const page = new Page(this.pageID, api);
    return { page, acc, api };
  }
}
