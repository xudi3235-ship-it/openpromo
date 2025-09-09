import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { defineEvent } from "@core/experimental/event";
import { Actor } from "@core/helpers/actor";
import {
  afterTx,
  and,
  createTransaction,
  db,
  eq,
  useTransaction,
} from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  PendingContentGroupInsert,
  type PendingContentGroupSelect,
  pendingContentGroupTable,
  type UnifiedContentFacebookPost,
  UnifiedContentInsert,
  type UnifiedContentInstagramPost,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { env } from "@core/utils/env";
import { NotImplementedError } from "@core/utils/error";
import { fn } from "@core/utils/fn";
import { nullThrows } from "@openpromo/js-shared/common";
import { onlyOrThrow } from "@openpromo/js-shared/iterable";
import { FacebookAdsApi, Page, Photo } from "facebook-nodejs-business-sdk";
import type { ZodType } from "zod";
import * as z from "zod";
import {
  type AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "../schema/placement";

abstract class EntUnifiedContentBase extends Ent<UnifiedContentSelect> {
  static type = "unified_content";

  data: UnifiedContentSelect;
  constructor(data: UnifiedContentSelect) {
    super(data);
    this.data = data;
  }
  toJSON() {
    return this.data;
  }
  static Schemas() {
    return {
      create: UnifiedContentInsert.omit({
        workspaceId: true,
      }),
    };
  }
  fromUnifiedContent(_data: UnifiedContentSelect): EntUnifiedContentBase {
    throw new NotImplementedError();
  }
  /**
   * creates a piece of unified content.
   * 1. backfilled from source plat.
   * 2. scheduled, handle scheduling.
   * 3. drafts
   */
  static create = fn(this.Schemas().create, async (input) => {
    const workspaceID = Actor.workspaceID();
    return useTransaction(async (tx) => {
      const [content] = await tx
        .insert(unifiedContentTable)
        .values({
          ...input,
          workspaceId: workspaceID,
        })
        .returning();
      await afterTx(async () => {
        // TODO: handle side effects
      });
      return content;
    });
  });
  static createMany = fn(this.Schemas().create.array(), async (inputArray) => {
    return inputArray.map(async (input) => this.create(input));
  });
  public static async _fromID(id: string): Promise<UnifiedContentSelect> {
    const workspaceID = Actor.workspaceID();
    const [post] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.id, id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      )
      .limit(1);
    console.log("// post: " + post);
    if (!post) throw new Error(`UnifiedContent ${id} not found`);
    return post;
  }
  // Abstract method for platform-specific deletion
  protected abstract deleteSrc(): Promise<void>;
  public async _delete(): Promise<UnifiedContentSelect> {
    // TODO: how do we enforce consistency here??
    const workspaceID = Actor.workspaceID();

    // If content is published, delete from platform first
    if (this.isPublished()) {
      await this.deleteSrc();
    }

    // Then delete from our database
    const [deleted] = await db()
      .delete(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.id, this.data.id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      )
      .returning();

    if (!deleted) throw new Error(`Content ${this.data.id} not found`);
    return deleted;
  }
  public isScheduled(): boolean {
    return this.data.publishingStatus === "SCHEDULED";
  }
  public isDraft(): boolean {
    return this.data.publishingStatus === "DRAFT";
  }
  public isPublished(): boolean {
    return this.data.publishingStatus === "PUBLISHED";
  }
  public async toPendingPublishGroup() {
    const workspaceID = Actor.workspaceID();
    const linkedGroupId = this.data.pendingContentGroupId;
    // not a scheduled or draft
    if (!linkedGroupId) {
      throw new Error(
        `Content ${this.data.id} is not in a pending publish group`,
      );
    }
    const [g] = await db()
      .select()
      .from(pendingContentGroupTable)
      .where(
        and(
          eq(pendingContentGroupTable.workspaceId, workspaceID),
          eq(pendingContentGroupTable.id, linkedGroupId),
        ),
      )
      .limit(1);
    return g;
  }
  public placement(): AllPlacement {
    return this.data.placement;
  }
}

class EntPendingContent extends EntUnifiedContentBase {
  protected deleteSrc(): Promise<void> {
    // noop.
    return Promise.resolve();
  }
  override isPublished(): boolean {
    return false; // not possible
  }
  static async fromID(id: string): Promise<EntPendingContent> {
    return new EntPendingContent(await EntUnifiedContentBase._fromID(id));
  }
  static fromUnifiedContent(data: UnifiedContentSelect): EntUnifiedContentBase {
    return new EntPendingContent(data);
  }
  toScheduledContent(): EntScheduledContent {
    return new EntScheduledContent(this.data);
  }
  static async _createDummy(pageID?: string): Promise<EntPendingContent> {
    const acc = await ConnectedAccount._createDummy();
    const content = await EntPendingContent.create({
      placement: "FB_FEED",
      connectedAccountId: acc.id,
      publishingStatus: "SCHEDULED",
      placementSpec: {
        identity: {
          pageId: pageID ?? acc.externalAccountId,
          userId: "dummy_user_id",
        },
        actor: Actor.assert("workspace_user"),
        placement: "FB_FEED",
        postSpec: {
          message: "trust me bro - from openpromo",
          attachments: [
            {
              type: "photo",
              id: "your_mom",
            },
            {
              type: "video",
              id: "your_mom_again",
            },
          ],
        },
      },
      schedulingSpec: {
        scheduledPublishAt: new Date(Date.now() + 5 * 1000), // 5 seconds later
      },
    });
    return new EntPendingContent(content);
  }
  facebookFeedPlacementSpec(): FBFeedPlacementSpec {
    const p = this.placement();
    if (p !== "FB_FEED") {
      throw new Error(`Content ${this.data.id} is not FB_FEED placement`);
    }
    const {
      data: spec,
      success,
      error,
    } = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new Error(`Invalid placementSpec for content ${this.data.id}`);
    }
    return spec;
  }
}

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
class EntFBFeedPendingContent extends EntPendingContent {
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

/**
 * a pending instagram feed content. NOTE: feed = post + reel
 * seems like platforms are merging both.
 * ref: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
class EntIGFeedPendingContent extends EntPendingContent {
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
    if (!spec.igAccountID) {
      throw new Error(
        `IG placementSpec missing igAccountID for content ${this.data.id}`,
      );
    }
    this.spec = spec;
    this.igAccountID = spec.igAccountID;
  }
  async createSinglePhotoPost() {
    const { igAccountID } = await this.identity();
    // 1. create media container
    const containerId = await this.createMediaContainer({
      caption: "trust me bro",
      imageUrl:
        "https://videos.openai.com/vg-assets/assets%2Ftask_01k4k36ycreev9qdkzctsrsxbg%2F1757282642_img_0.webp?st=2025-09-08T22%3A27%3A05Z&se=2025-09-14T23%3A27%3A05Z&sks=b&skt=2025-09-08T22%3A27%3A05Z&ske=2025-09-14T23%3A27%3A05Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=8ebb0df1-a278-4e2e-9c20-f2d373479b3a&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=Bt58qPWEscV5TSVmw%2BvJAoQqTHlMHCucawymOb5R7CM%3D&az=oaivgprodscus",
    });
    // 2. publish media container
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        creation_id: containerId,
      },
      z.object({ id: z.string().describe("instagram post id") }),
    );
    return { postId };
  }
  /**
   * IG's carousel supports up 10, mix of photos and videos.
   * photos are easy, video containers need to be uploaded and ready first.
   * Hence we expose composable steps, workflows need to wire them up.
   */
  async createPhotoCarouselPost() {
    // !!NOTE: Jpeg is only supported image format.
    // ref: https://github.com/fbsamples/reels_publishing_apis/blob/main/insta_reels_publishing_api_sample/index.js#L276
    const photos =
      this.spec.attachments?.filter((a) => a.type === "photo") ?? [];
    if (photos.length === 0) {
      throw new Error("no photo attachment provided");
    }
    const { igAccountID } = await this.identity();
    // 1. create media containers for each photo
    const containerIds = await Promise.all(
      photos.map(async (p) => {
        return await this.createMediaContainer({
          caption: "TODO: caption for each item?",
          imageUrl: p.presignedUrl,
          isCarouselItem: true,
        });
      }),
    );
    // 2. create a carousel container
    const parentContainerId = await this.createMediaContainer({
      caption: "trust me bro - carousel",
      mediaType: "CAROUSEL",
      children: containerIds,
    });
    console.log("// created carousel container", { parentContainerId });
    // 3. create media using the parent container id
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        caption: "trust me bro - carousel from openpromo",
        creation_id: parentContainerId,
      },
      z.object({ id: z.string().describe("instagram post id") }),
    );
    return { postId };
  }
  async createReel() {
    const videos =
      this.spec.attachments?.filter((a) => a.type === "video") ?? [];
    if (videos.length !== 1) {
      throw new Error("only support 1 video attachment for reel");
    }
    const video = onlyOrThrow(videos);
    // 1. create media container for the video
    const containerId = await this.createMediaContainer({
      caption: "trust me bro - reel",
      videoUrl: video.presignedUrl,
      mediaType: "REELS",
    });
    // 2. poll until the container is ready
    let attempts = 10;
    let ready = false;
    while (attempts > 0) {
      const status = await this.getMediaContainerStatus(containerId);
      console.log(`// ${attempts} media container status`, status);
      if (status.status_code === "FINISHED") {
        ready = true;
        break;
      }
      attempts--;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (!ready) {
      throw new Error("video media container is not ready in time");
    }
    // 3. publish reel
    const { igAccountID } = await this.identity();
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        creation_id: containerId,
      },
      z.object({ id: z.string().describe("instagram post id") }),
    );
    return { postId };
  }
  async createMediaContainer(params: {
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    isCarouselItem?: boolean;
    mediaType?: "VIDEO" | "REELS" | "STORIES" | "CAROUSEL";
    children?: string[]; // media container ids
  }) {
    const { igAccountID } = await this.identity();
    const { caption, imageUrl, videoUrl, isCarouselItem, mediaType, children } =
      params;
    if (!imageUrl && !videoUrl && mediaType !== "CAROUSEL") {
      throw new Error("either imageUrl or videoUrl must be provided");
    }
    if (videoUrl && !mediaType) {
      throw new Error("mediaType must be provided for video");
    }
    if (mediaType === "CAROUSEL" && (!children || children.length === 0)) {
      throw new Error(
        "you are creating a carousel parent container, children is required. Create children containers first.",
      );
    }
    // 1. create media container for individual item
    const { id: mediaContainerId } = await this.api(
      `/${igAccountID}/media`,
      "POST",
      {
        caption,
        image_url: imageUrl,
        video_url: videoUrl,
        is_carousel_item: isCarouselItem,
        media_type: mediaType,
        children: children ? children.join(",") : undefined,
      },
      // FIXME: for videos, this might not return id immediately.
      // need to use the status endpoint to poll it.
      z.object({ id: z.string().describe("media container id") }),
    );
    // 2. IMPORTANT: next we create another media container with children
    console.log("// created media container", { mediaContainerId });
    return mediaContainerId;
  }
  protected async getMediaContainerStatus(containerId: string) {
    /**
     * If you are able to create a container for a video but the POST /<IG_ID>/media_publish endpoint does not return the published media ID, you can get the container's publishing status by querying the GET /<IG_CONTAINER_ID>?fields=status_code endpoint. This endpoint will return one of the following:

      EXPIRED — The container was not published within 24 hours and has expired.
      ERROR — The container failed to complete the publishing process.
      FINISHED — The container and its media object are ready to be published.
      IN_PROGRESS — The container is still in the publishing process.
      PUBLISHED — The container's media object has been published.
     */
    return this.api(
      `/${containerId}`,
      "GET",
      null,
      z.object({
        status_code: z.enum([
          "EXPIRED",
          "ERROR",
          "FINISHED",
          "IN_PROGRESS",
          "PUBLISHED",
        ]),
      }),
      new URLSearchParams({ fields: "status_code" }),
    );
  }
  protected async identity() {
    const acc = await ConnectedAccount.fromIGAccountID(this.igAccountID);
    return {
      acc,
      igAccountID: this.igAccountID,
      accessToken: acc.encryptedAccessToken,
    };
  }
  protected async api<TOut extends ZodType>(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT",
    // biome-ignore lint/suspicious/noExplicitAny: later
    body: any,
    outSchema: TOut,
    params: URLSearchParams = new URLSearchParams({}),
  ) {
    // IG has two login types, IG login and FB login.
    // for now we built IG login only, hence can't use the FB sdk.
    // wrapping the fetch for now.
    const { accessToken } = await this.identity();
    const base = `https://graph.instagram.com/v23.0`;
    const url = `${base}${path}?access_token=${accessToken}&${params.toString()}`;
    console.log("// IG API request", { url, method, body });
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `IG API request failed: ${res.status} ${res.statusText} - ${errorText}`,
      );
    }
    const resJson = await res.json();
    console.log("// IG API response", resJson);

    const { data, success, error } = outSchema.safeParse(resJson);
    if (!data || !success || error) {
      throw new Error(`IG API response parse error: ${error?.message}`);
    }
    return data as z.output<TOut>;
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
        igAccountID,
        actor: Actor.assert("workspace_user"),
        placement: "IG_FEED",
        caption: "dummy caption",
        attachments: [
          // {
          //   type: "photo",
          //   id: "your_mom",
          //   presignedUrl:
          //     "https://videos.openai.com/vg-assets/assets%2Ftask_01k4mk41aaeg8vx466pehg1cr7%2F1757332857_img_0.webp?st=2025-09-09T02%3A20%3A03Z&se=2025-09-15T03%3A20%3A03Z&sks=b&skt=2025-09-09T02%3A20%3A03Z&ske=2025-09-15T03%3A20%3A03Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=3d249c53-07fa-4ba4-9b65-0bf8eb4ea46a&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=ggevPmmqW%2Bjs5epahYb%2Bx5EPRh4kTbVfi8OtOjnqE%2Fs%3D&az=oaivgprodscus",
          // },
          // {
          //   type: "photo",
          //   id: "your_mom_again",
          //   presignedUrl:
          //     "https://videos.openai.com/vg-assets/assets%2Ftask_01k4nqawy0f55sbcejpqxkzcfg%2F1757370783_img_1.webp?st=2025-09-09T02%3A23%3A11Z&se=2025-09-15T03%3A23%3A11Z&sks=b&skt=2025-09-09T02%3A23%3A11Z&ske=2025-09-15T03%3A23%3A11Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=3d249c53-07fa-4ba4-9b65-0bf8eb4ea46a&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=1hFzLeje5KTjKzSl%2FRj%2F7wNTEtrCLoEvL%2FOPMa%2F6x2Y%3D&az=oaivgprodscus",
          // },
          {
            type: "video",
            id: "your_mom_video",
            presignedUrl:
              "https://customer-ebwkk8kv75vt1wbh.cloudflarestream.com/0e859aa05d5af57db7b1d5888d6093ce/downloads/default.mp4",
          },
        ],
      },
      schedulingSpec: {
        scheduledPublishAt: new Date(Date.now() + 5 * 1000), // 5 seconds later
      },
    });
    return new EntIGFeedPendingContent(content);
  }
}

class EntScheduledContent extends EntPendingContent {
  constructor(data: UnifiedContentSelect) {
    super(data);
    if (!this.isScheduled()) {
      throw new Error(`Content ${data.id} is not scheduled`);
    }
    const spec = this.data.schedulingSpec;
    if (!spec?.scheduledPublishAt) {
      throw new Error(`Content ${this.data.id} missing schedulingSpec`);
    }
  }
  public getScheduledAt(): Date {
    const spec = nullThrows(this.data.schedulingSpec);
    return spec.scheduledPublishAt;
  }
}

/**
 * Entity representing a pending content group. A pending content group supports scheduling & drafts, containing N unified content.
 */
class EntPendingContentGroup {
  data: PendingContentGroupSelect;

  constructor(data: PendingContentGroupSelect) {
    this.data = data;
  }
  // ================== static ==================
  static Events() {
    return {
      // each content will have separate events for publish now
      Publish: defineEvent(
        "pending_content_group.publish",
        z.object({
          groupID: z.string(),
          contentID: z.string(),
        }),
      ),
      Scheduled: defineEvent(
        "pending_content_group.scheduled",
        z.object({
          groupID: z.string(),
          contentID: z.string(),
          scheduleName: z.string(),
          scheduleArn: z.string(),
        }),
      ),
    };
  }
  static Schemas() {
    // zod schemas
    const create = z.object({
      group: PendingContentGroupInsert.omit({ workspaceId: true }),
      contents: z.array(UnifiedContentInsert.omit({ workspaceId: true })),
    });
    return {
      create,
    };
  }
  public static async list() {
    throw new NotImplementedError(
      "paginated query for pending content groups.",
    );
  }

  public static async fromID(id: string) {
    const workspaceID = Actor.workspaceID();
    const [group] = await db()
      .select()
      .from(pendingContentGroupTable)
      .where(
        and(
          eq(pendingContentGroupTable.id, id),
          eq(pendingContentGroupTable.workspaceId, workspaceID),
        ),
      )
      .limit(1);
    if (!group) throw new Error(`EntPendingContentGroup ${id} not found`);
    return new EntPendingContentGroup(group);
  }
  /**
   * create a pending content group. Core action that powers scheduling
   * and draft. It will create a group as well as associated unified contents.(1..N)
   */
  public static create = fn(
    this.Schemas().create,
    async ({ group, contents }) => {
      const workspaceID = Actor.workspaceID();
      return createTransaction(async (tx) => {
        // 1. create pending content group
        const [pendingContentGroup] = await tx
          .insert(pendingContentGroupTable)
          .values({
            ...group,
            workspaceId: workspaceID,
          })
          .returning();
        if (!pendingContentGroup)
          throw new Error(`Failed to create pending content group`);
        // 2. create unified contents
        const unifiedContents = await tx
          .insert(unifiedContentTable)
          .values(
            contents.map((content) => ({
              ...content,
              workspaceId: workspaceID,
              pendingContentGroupId: pendingContentGroup.id,
            })),
          )
          .returning();

        // 3. handle scheduled contents
        await afterTx(async () => {
          // Binding.getScheduler();
          unifiedContents.map(async (content) => {
            const spec = content.schedulingSpec;
            // not a scheduled content, skip
            if (!spec?.scheduledPublishAt) return;
            // TODO: implement scheduling logic
          });
        });
        return { pendingContentGroup, unifiedContents };
      });
    },
  );
  // ================== cls methods ==================

  public async isScheduled(): Promise<boolean> {
    return this.data.publishingStatus === "SCHEDULED";
  }
  public async isDraft(): Promise<boolean> {
    return this.data.publishingStatus === "DRAFT";
  }
  public async delete(): Promise<PendingContentGroupSelect> {
    // 1. delete the pending group
    const workspaceID = Actor.workspaceID();
    return createTransaction(async (tx) => {
      const [deleted] = await tx
        .delete(pendingContentGroupTable)
        .where(
          and(
            eq(pendingContentGroupTable.id, this.data.id),
            eq(pendingContentGroupTable.workspaceId, workspaceID),
          ),
        )
        .returning();
      if (!deleted)
        throw new Error(`EntPendingContentGroup ${this.data.id} not found`);
      // 2. delete the linked drafts/scheduled contents
      await tx
        .delete(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.pendingContentGroupId, this.data.id),
            eq(unifiedContentTable.workspaceId, workspaceID),
          ),
        )
        .returning();
      return deleted;
    });
  }
  public async getContents(): Promise<EntPendingContent[]> {
    const workspaceID = Actor.workspaceID();
    const contents = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.pendingContentGroupId, this.data.id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      );
    return contents.map((content) => new EntPendingContent(content));
  }
}

/**
 * app-level entity for Facebook posts. Internally it uses the unified content
 * entity. We wrap it this way to provide platform specific operations.
 */
export class EntFacebookPost extends EntUnifiedContentBase {
  toJSON(): UnifiedContentFacebookPost {
    return this.data as UnifiedContentFacebookPost;
  }
  fromUnifiedContent(data: UnifiedContentSelect): EntFacebookPost {
    return new EntFacebookPost(data);
  }

  public async fromUnifiedContentID(id: string): Promise<EntFacebookPost> {
    return new EntFacebookPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError("Facebook post deletion not yet implemented");
  }

  public async _delete(): Promise<UnifiedContentFacebookPost> {
    return (await super._delete()) as UnifiedContentFacebookPost;
  }
}

export class EntInstagramPost extends EntUnifiedContentBase {
  toJSON(): UnifiedContentInstagramPost {
    return this.data as UnifiedContentInstagramPost;
  }
  fromUnifiedContent(data: UnifiedContentSelect): EntInstagramPost {
    return new EntInstagramPost(data);
  }

  async fromUnifiedContentID(id: string): Promise<EntInstagramPost> {
    return new EntInstagramPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError(
      "Instagram post deletion not yet implemented",
    );
  }

  public async _delete(): Promise<UnifiedContentInstagramPost> {
    return (await super._delete()) as UnifiedContentInstagramPost;
  }
}

// ================== exports ==================
export {
  EntFBFeedPendingContent,
  EntIGFeedPendingContent,
  EntPendingContent,
  EntPendingContentGroup,
  EntScheduledContent,
};
