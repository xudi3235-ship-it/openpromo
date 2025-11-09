import type { IGFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import * as z from "zod";
import {
  type InstagramIdentityContext,
  instagramGraphRequest,
  resolveInstagramIdentity,
} from "./api";

const log = Log.create({ namespace: "instagram-media-client" });

const mediaContainerResponse = z.object({
  id: z.string(),
});

const publishResponse = z.object({
  id: z.string(),
});

const containerStatusResponse = z.object({
  status_code: z.enum([
    "EXPIRED",
    "ERROR",
    "FINISHED",
    "IN_PROGRESS",
    "PUBLISHED",
  ]),
});

const mediaFetchResponse = z.object({
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

const permalinkResponse = z.object({
  permalink: z.string().url().optional(),
});

export type InstagramMediaRecord = z.infer<typeof mediaFetchResponse>;

type InstagramAttachment = NonNullable<
  IGFeedPlacementSpec["attachments"]
>[number];

export class InstagramMediaClient {
  private constructor(private readonly ctx: InstagramIdentityContext) {}

  static async forPlacementSpec(
    spec: IGFeedPlacementSpec,
  ): Promise<InstagramMediaClient> {
    const identity = await resolveInstagramIdentity(spec);
    return new InstagramMediaClient(identity);
  }

  get igAccountID(): string {
    return this.ctx.igAccountID;
  }

  async createMediaContainer(params: {
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    isCarouselItem?: boolean;
    mediaType?: "VIDEO" | "REELS" | "STORIES" | "CAROUSEL";
    children?: string[];
  }): Promise<string> {
    const body: Record<string, string | boolean | undefined> = {
      caption: params.caption,
      image_url: params.imageUrl,
      video_url: params.videoUrl,
      is_carousel_item: params.isCarouselItem,
      media_type: params.mediaType,
      children: params.children?.join(","),
    };

    const response = await instagramGraphRequest(
      this.ctx,
      `/${this.igAccountID}/media`,
      {
        method: "POST",
        body,
        // !! for now our IG login support is all IG-login
        // later we might support FB-login as well?
      },
    );

    const parsed = mediaContainerResponse.safeParse(response);
    if (!parsed.success) {
      log.info("invalid instagram media container response", {
        response,
        error: parsed.error?.message,
      });
      throw new Error("instagram media container response missing id");
    }

    log.info("created instagram media container", {
      containerId: parsed.data.id,
      mediaType: params.mediaType ?? "default",
      isCarouselItem: params.isCarouselItem ?? false,
    });

    return parsed.data.id;
  }

  async publishContainer(params: {
    creationId: string;
    caption?: string;
  }): Promise<{ postId: string }> {
    const body: Record<string, string | undefined> = {
      creation_id: params.creationId,
    };
    if (params.caption) {
      body.caption = params.caption;
    }

    const response = await instagramGraphRequest(
      this.ctx,
      `/${this.igAccountID}/media_publish`,
      {
        method: "POST",
        body,
      },
    );

    const parsed = publishResponse.safeParse(response);
    if (!parsed.success) {
      log.info("invalid instagram publish response", {
        response,
        error: parsed.error?.message,
      });
      throw new Error("instagram publish response missing id");
    }

    return { postId: parsed.data.id };
  }

  async getContainerStatus(containerId: string) {
    const response = await instagramGraphRequest(this.ctx, `/${containerId}`, {
      method: "GET",
      searchParams: {
        fields: "status_code",
      },
    });

    const parsed = containerStatusResponse.safeParse(response);
    if (!parsed.success) {
      log.info("invalid instagram container status response", {
        containerId,
        response,
        error: parsed.error?.message,
      });
      throw new Error("instagram container status response invalid");
    }

    return parsed.data;
  }

  async fetchMedia(mediaId: string): Promise<InstagramMediaRecord> {
    const response = await instagramGraphRequest(this.ctx, `/${mediaId}`, {
      method: "GET",
      searchParams: {
        fields:
          "id,media_type,media_url,thumbnail_url,children{id,media_type,media_url,thumbnail_url}",
      },
    });

    const parsed = mediaFetchResponse.safeParse(response);
    if (!parsed.success) {
      log.info("invalid instagram media response", {
        mediaId,
        response,
        error: parsed.error?.message,
      });
      throw new Error("instagram media response invalid");
    }

    return parsed.data;
  }

  async fetchPermalink(mediaId: string): Promise<string | null> {
    const response = await instagramGraphRequest(this.ctx, `/${mediaId}`, {
      method: "GET",
      searchParams: {
        fields: "permalink",
      },
    });

    const parsed = permalinkResponse.safeParse(response);
    if (!parsed.success) {
      log.info("invalid instagram permalink response", {
        mediaId,
        response,
        error: parsed.error?.message,
      });
      throw new Error("instagram permalink response invalid");
    }

    return parsed.data.permalink ?? null;
  }

  async createComment(mediaId: string, message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed) return;

    await instagramGraphRequest(this.ctx, `/${mediaId}/comments`, {
      method: "POST",
      body: {
        message: trimmed,
      },
    });

    log.info("posted instagram first comment", { mediaId });
  }

  /**
   * Utility to prepare remote attachment records based on Instagram media response.
   */
  mapRemoteMediaToAttachments(
    media: InstagramMediaRecord,
    existingAttachments: InstagramAttachment[],
  ) {
    const remoteItems =
      media.children?.data && media.children.data.length > 0
        ? media.children.data
        : [media];

    if (remoteItems.length === 0) {
      return [];
    }

    return remoteItems.map((item, index) => {
      const isVideo = item.media_type === "VIDEO";
      const imageUrl = !isVideo ? item.media_url : undefined;
      const videoUrl = isVideo ? item.media_url : undefined;
      const fallbackThumbnail =
        item.thumbnail_url ??
        imageUrl ??
        existingAttachments[index]?.thumbnailUrl;

      return {
        mediaId: item.id,
        mediaType: item.media_type,
        imageUrl,
        videoUrl,
        thumbnailUrl: fallbackThumbnail,
      };
    });
  }
}
