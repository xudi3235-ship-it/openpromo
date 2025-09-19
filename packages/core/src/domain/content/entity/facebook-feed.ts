import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  FBFeedPlacementSpec,
  type PlacementSpec,
  type UnifiedContentSelect,
} from "@core/schemas/content.sql";
import { env } from "@core/utils/env";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { FacebookAdsApi, Page, Photo } from "facebook-nodejs-business-sdk";
import {
  buildAttachmentMetadata,
  mergeAttachmentMetadata,
} from "../attachments/metadata";
import { facebookGraphRequest, resolveFacebookIdentity } from "./facebook/api";
import { EntPendingContent } from "./pending-content";

const log = Log.create({ namespace: "facebook-feed-entity" });

type FBVideoStatusResponse = {
  status: {
    video_status:
      | "error"
      | "expired"
      | "processing"
      | "ready" // ready to be published
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

type FBPostAttachmentsResponse = {
  attachments?: {
    data?: Array<{
      media?: {
        image?: {
          src?: string;
        };
        source?: string;
      };
      type?: string;
      subattachments?: {
        data?: Array<{
          media?: {
            image?: {
              src?: string;
            };
            source?: string;
          };
          type?: string;
        }>;
      };
    }>;
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
  /**
   * we expose composable steps to create different types of posts.
   * Workflows should orchestrate these steps.
   */
  async createTextPost() {
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
    return { postId: postID };
  }
  async createPhotoPost() {
    // ref: https://developers.facebook.com/docs/graph-api/reference/page/photos/
    const { page } = await this.identity();
    if (!this.isMultiPhotoPost())
      throw new Error("no photo attachment provided");
    const photos = this.photosAttachments();
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
    return { postId: postID };
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
    const { accessToken } = await this.identity();
    const cdnUrl = res?.default?.url ?? null;
    if (!cdnUrl) {
      throw new Error("failed to get video CDN url");
    }
    // 1. upload the video
    const response = await fetch(uploadSessionUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
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

  async isVideoPublishComplete(videoId: string) {
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

  async getVideoStatus(videoId: string) {
    const ctx = await resolveFacebookIdentity(this.spec);
    const resJson = await facebookGraphRequest<FBVideoStatusResponse>(
      ctx,
      `/${videoId}`,
      {
        searchParams: { fields: "status" },
      },
    );
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
    const video = await page.createVideoReel(
      [], // fields
      {
        video_id: videoId,
        description: description,
        upload_phase: "finish",
        video_state: "PUBLISHED",
      },
    );
    // @ts-expect-error
    const rawID = video.post_id ?? null;
    // @ts-expect-error
    if (!video.success || !rawID)
      throw new WorkflowError(
        `failed to publish reel for content ${this.data.id}: response indicates failure or missing postID`,
      );
    // it might be in the format of <page_id>_<post_id> or just <post_id>
    const postIDOnly = rawID.includes("_") ? rawID.split("_")[1] : rawID;
    return { postId: postIDOnly };
  }

  async syncAttachmentsFromFacebook(postId: string): Promise<void> {
    const localAttachments = this.attachments();
    if (localAttachments.length === 0) return;

    const ctx = await resolveFacebookIdentity(this.spec);
    const graphPostId = postId.includes("_")
      ? postId
      : `${ctx.pageID}_${postId}`;

    const json = await facebookGraphRequest<FBPostAttachmentsResponse>(
      ctx,
      `/${graphPostId}`,
      {
        searchParams: {
          fields:
            "attachments{media{image{src}},subattachments{data{media{image{src}}}}}",
        },
      },
    );
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
      const videoMeta = await facebookGraphRequest<
        { video_id?: string } | undefined
      >(ctx, `/${graphPostId}`, {
        searchParams: {
          fields: "video_id",
        },
      });

      const videoId = videoMeta?.video_id;

      if (videoId) {
        const videoDetails = await facebookGraphRequest<{
          id?: string;
          source?: string;
          thumbnails?: { data?: Array<{ uri?: string }> };
        }>(ctx, `/${videoId}`, {
          searchParams: {
            fields: "id,source,thumbnails{uri}",
          },
        });

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
          opLocalAssetDeleted: localAssetReplaced ? true : undefined,
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
  protected async api(accessToken: string) {
    return FacebookAdsApi.init(accessToken).setDebug(env.DEBUG === "true");
  }
  protected async identity() {
    const ctx = await resolveFacebookIdentity(this.spec);
    const api = this.api(ctx.accessToken);
    const page = new Page(ctx.pageID, api);
    return { page, api, accessToken: ctx.accessToken, pageID: ctx.pageID };
  }
}
