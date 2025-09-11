import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import type { ZodType } from "zod";
import * as z from "zod";
import { IGFeedPlacementSpec } from "../schema/placement";
import { EntPendingContent } from "./pending-content";

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
        identity: {
          connectedAccountID: acc.id,
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
