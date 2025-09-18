import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import {
  IGFeedPlacementSpec,
  type PlacementSpec,
  type SharedAttachmentSpec,
  type UnifiedContentSelect,
} from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { Log } from "@core/utils/log";
import type { ZodType } from "zod";
import * as z from "zod";
import { EntPendingContent } from "./pending-content";

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
  async createSinglePhotoPost() {
    const photos = this.photosAttachments();
    if (photos.length !== 1) {
      throw new Error("single photo post must have exactly one photo");
    }
    const photo = onlyOrThrow(photos);
    if (!photo.publicUrl) {
      throw new Error("photo attachment missing publicUrl");
    }
    // 1. create media container
    const { igAccountID } = await this.identity();
    const mediaContainerId = await this.createMediaContainer({
      caption: this.caption(),
      imageUrl: photo.publicUrl,
    });
    console.log("// created media container", { mediaContainerId });
    // 2. create media using the container id
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        caption: this.caption(),
        creation_id: mediaContainerId,
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
    const photos = this.photosAttachments();
    if (photos.length === 0) throw new Error("no photo attachment provided");
    const { igAccountID } = await this.identity();
    // 1. create media containers for each photo
    const containerIds = await Promise.all(
      photos.map(async (p) => {
        return await this.createMediaContainer({
          caption: this.caption(),
          imageUrl: p.publicUrl,
          isCarouselItem: true,
        });
      }),
    );
    // 2. create a carousel container
    const parentContainerId = await this.createMediaContainer({
      caption: this.caption(),
      mediaType: "CAROUSEL",
      children: containerIds,
    });
    console.log("// created carousel container", { parentContainerId });
    // 3. create media using the parent container id
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        caption: this.caption(),
        creation_id: parentContainerId,
      },
      z.object({ id: z.string().describe("instagram post id") }),
    );
    return { postId };
  }
  async createMixedCarouselContainers() {
    // Mixed carousel supports up to 10 items, mix of photos and videos
    // This method only creates containers, polling is handled by workflow
    const attachments = this.attachments();
    if (attachments.length === 0) throw new Error("no attachments provided");
    if (attachments.length > 10)
      throw new Error("carousel supports max 10 items");

    const hasPhotos = attachments.some((a) => a.type === "photo");
    const hasVideos = attachments.some((a) => a.type === "video");

    if (!hasPhotos && !hasVideos) {
      throw new Error("no valid photo or video attachments found");
    }

    // Create media containers in the same order as attachments to preserve order
    const containerIds: string[] = [];
    const videoContainerInfo: { id: string; index: number }[] = [];

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];

      if (attachment.type === "photo") {
        const containerId = await this.createMediaContainer({
          caption: this.caption(),
          imageUrl: attachment.publicUrl,
          isCarouselItem: true,
        });
        containerIds.push(containerId);
      } else if (attachment.type === "video") {
        const containerId = await this.createMediaContainer({
          caption: this.caption(),
          videoUrl: attachment.presignedUrl,
          mediaType: "VIDEO", // Use VIDEO for carousel items, not REELS
          isCarouselItem: true,
        });
        containerIds.push(containerId);
        videoContainerInfo.push({ id: containerId, index: i });
      }
    }

    console.log("// created all media containers in order", { containerIds });

    return {
      containerIds,
      videoContainerInfo,
    };
  }

  async publishCarousel(containerIds: string[]) {
    // Create the parent carousel container and publish
    const parentContainerId = await this.createMediaContainer({
      caption: this.caption(),
      mediaType: "CAROUSEL",
      children: containerIds,
    });
    console.log("// created carousel container", { parentContainerId });

    // Publish the carousel
    const { igAccountID } = await this.identity();
    const { id: postId } = await this.api(
      `/${igAccountID}/media_publish`,
      "POST",
      {
        caption: this.caption(),
        creation_id: parentContainerId,
      },
      z.object({ id: z.string().describe("instagram post id") }),
    );

    return { postId };
  }
  async createReelContainer() {
    const videos =
      this.spec.attachments?.filter((a) => a.type === "video") ?? [];
    if (videos.length !== 1) {
      throw new Error("only support 1 video attachment for reel");
    }
    const video = onlyOrThrow(videos);
    console.log({ video });
    if (!video.presignedUrl) throw new Error("video missing presignedUrl");

    // Create media container for the video (no polling here)
    const containerId = await this.createMediaContainer({
      caption: this.caption(),
      videoUrl: video.presignedUrl,
      mediaType: "REELS",
    });

    return { containerId };
  }

  async publishReelFromContainer(containerId: string) {
    // Publish reel using the ready container
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

  async syncAttachmentsFromInstagram(postId: string): Promise<void> {
    const localAttachments = this.attachments();
    if (localAttachments.length === 0) return;

    const mediaSchema = z.object({
      id: z.string(),
      media_type: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
      media_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      children: z
        .object({
          data: z.array(
            z.object({
              id: z.string(),
              media_type: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
              media_url: z.string().optional(),
              thumbnail_url: z.string().optional(),
            }),
          ),
        })
        .optional(),
    });

    const remoteMedia = await this.api(
      `/${postId}`,
      "GET",
      null,
      mediaSchema,
      new URLSearchParams({
        fields:
          "id,media_type,media_url,thumbnail_url,children{id,media_type,media_url,thumbnail_url}",
      }),
    );

    const remoteItems =
      remoteMedia.children?.data && remoteMedia.children.data.length > 0
        ? remoteMedia.children.data
        : [remoteMedia];

    if (remoteItems.length === 0) {
      log.warn("no remote media returned from instagram", { postId });
      return;
    }

    if (remoteItems.length !== localAttachments.length) {
      log.warn("remote media count mismatch", {
        postId,
        remoteCount: remoteItems.length,
        localCount: localAttachments.length,
      });
    }

    const remoteRecords = remoteItems.map((item) => {
      const isVideo = item.media_type === "VIDEO";
      const imageUrl = !isVideo ? item.media_url : undefined;
      const videoUrl = isVideo ? item.media_url : undefined;

      return {
        mediaId: item.id,
        mediaType: item.media_type,
        imageUrl,
        videoUrl,
        thumbnailUrl: item.thumbnail_url ?? imageUrl ?? undefined,
      };
    });

    const attachmentsToDelete: SharedAttachmentSpec[] = [];
    const originalAttachments = localAttachments.map((attachment) => ({
      ...attachment,
    }));

    const didUpdate = await this.updateAttachments(
      (attachment, index) => {
        const remote =
          remoteRecords[index] ?? remoteRecords[remoteRecords.length - 1];
        if (!remote) return attachment;
        const original = originalAttachments[index] ?? attachment;

        const updated = { ...attachment } as typeof attachment;
        const nextMetadata = {
          ...(attachment.metadata ?? {}),
          instagramMediaId: remote.mediaId,
          instagramMediaType: remote.mediaType,
        } as Record<string, unknown>;
        let changed = false;
        let localAssetReplaced = false;

        const remotePrimaryUrl = remote.videoUrl ?? remote.imageUrl;

        if (remotePrimaryUrl) {
          if (updated.publicUrl !== remotePrimaryUrl) {
            updated.publicUrl = remotePrimaryUrl;
            changed = true;
            localAssetReplaced = true;
          }
          if (updated.presignedUrl) {
            updated.presignedUrl = undefined;
            changed = true;
            localAssetReplaced = true;
          }
          if (updated.s3Key) {
            updated.s3Key = undefined;
            changed = true;
            localAssetReplaced = true;
          }
          nextMetadata.instagramMediaUrl = remotePrimaryUrl;
        }

        if (
          remote.thumbnailUrl &&
          updated.thumbnailUrl !== remote.thumbnailUrl
        ) {
          updated.thumbnailUrl = remote.thumbnailUrl;
          changed = true;
          nextMetadata.instagramThumbnailUrl = remote.thumbnailUrl;
        }

        if (localAssetReplaced) {
          nextMetadata.localAssetDeleted = true;
          attachmentsToDelete.push(original);
        }

        if (changed) {
          updated.metadata = nextMetadata;
          return updated;
        }

        if (
          JSON.stringify(nextMetadata) !==
          JSON.stringify(attachment.metadata ?? {})
        ) {
          updated.metadata = nextMetadata;
          return updated;
        }

        return attachment;
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

    if (attachmentsToDelete.length > 0) {
      await this.deleteAttachmentAssets(attachmentsToDelete);
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
  async getMediaContainerStatus(containerId: string) {
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
    console.log("// IG API response", JSON.stringify(resJson, null, 2));

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
