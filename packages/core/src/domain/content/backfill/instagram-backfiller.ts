import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import {
  INSTAGRAM_MEDIA_DEFAULT_METRICS,
  InstagramMediaInsightsFetcher,
  type InstagramMediaType,
  instagramMediaMetricsToUnifiedContentMetrics,
} from "@core/domain/content/entity/instagram/mediaInsights";
import { db } from "@core/helpers/db";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type IGFeedPlacementSpec as IGFeedPlacementSpecType,
  IGPlacement,
  type SharedAttachmentSpec,
  type UnifiedContentMetrics,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { sql } from "drizzle-orm";
import type {
  BackfillParams,
  BackfillResult,
  BaseBackfillerDependencies,
  MirrorConfig,
  NormalizedBackfillItem,
} from "./base-backfiller";
import { BaseBackfiller } from "./base-backfiller";

type InstagramMediaChild = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
};

type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  permalink?: string;
  children?: {
    data?: InstagramMediaChild[];
  };
};

type InstagramIdentityContext = {
  igAccountID: string;
  accessToken: string;
};

type NormalizedInstagramPost = NormalizedBackfillItem & {
  caption: string;
  permalinkUrl?: string;
  mediaType?: string;
  productType: InstagramMediaType;
};

export type InstagramBackfillParams = BackfillParams;
export type InstagramBackfillResult = BackfillResult;

type InstagramBackfillerDependencies = BaseBackfillerDependencies & {
  metricsFetcher?: InstagramMediaInsightsFetcher;
};

export class InstagramBackfiller extends BaseBackfiller<
  NormalizedInstagramPost,
  InstagramIdentityContext,
  InstagramMedia
> {
  private readonly metricsFetcher: InstagramMediaInsightsFetcher;

  constructor(dependencies: InstagramBackfillerDependencies = {}) {
    const { metricsFetcher, ...baseDeps } = dependencies;
    super({ namespace: "instagram-backfiller", consolePrefix: "IG" }, baseDeps);
    this.metricsFetcher = metricsFetcher ?? new InstagramMediaInsightsFetcher();
  }

  protected async assertPlatform(account: ConnectedAccountSelect) {
    if (account.platform !== "INSTAGRAM") {
      throw new Error(
        `connected account ${account.id} is not an Instagram account`,
      );
    }
  }

  protected async prepareAccount(account: ConnectedAccountSelect) {
    const instagramAccount = await ConnectedAccount.fromIGAccountID(
      account.externalAccountId,
    );

    const context: InstagramIdentityContext = {
      igAccountID: instagramAccount.externalAccountId,
      accessToken: instagramAccount.encryptedAccessToken,
    };

    return { platformAccount: instagramAccount, context };
  }

  protected contextLogData(context: InstagramIdentityContext) {
    return { igAccountID: context.igAccountID };
  }

  protected async fetchRawItems(
    context: InstagramIdentityContext,
    start: Date,
    end: Date,
  ): Promise<InstagramMedia[]> {
    return this.fetchPublishedMedia(context, start, end);
  }

  protected normalizeItem(
    media: InstagramMedia,
  ): NormalizedInstagramPost | null {
    return this.normalizeMedia(media);
  }

  protected async fetchMetrics(
    posts: NormalizedInstagramPost[],
    context: InstagramIdentityContext,
  ): Promise<Map<string, UnifiedContentMetrics>> {
    const results = new Map<string, UnifiedContentMetrics>();

    for (const post of posts) {
      const metricsList =
        INSTAGRAM_MEDIA_DEFAULT_METRICS[post.productType] ??
        INSTAGRAM_MEDIA_DEFAULT_METRICS.FEED;

      try {
        const response = await this.metricsFetcher.fetch(
          { accessToken: context.accessToken },
          {
            mediaId: post.id,
            metrics: Array.from(metricsList),
            metricBreakdowns: {
              profile_activity: "action_type",
            },
          },
        );

        results.set(
          post.id,
          instagramMediaMetricsToUnifiedContentMetrics(response.metrics),
        );
      } catch (error) {
        this.log.warn("failed to fetch instagram metrics for media", {
          mediaId: post.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  protected async insertPosts(
    posts: NormalizedInstagramPost[],
    account: ConnectedAccountSelect,
    context: InstagramIdentityContext,
    metricsByPostId: Map<string, UnifiedContentMetrics>,
  ): Promise<void> {
    if (posts.length === 0) return;

    const values = posts
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((post) =>
        this.toUnifiedContentInsert(
          post,
          account,
          context,
          metricsByPostId.get(post.id),
        ),
      );

    if (values.length === 0) return;

    await db()
      .insert(unifiedContentTable)
      .values(values)
      .onConflictDoUpdate({
        target: unifiedContentTable.sourceContentId,
        set: {
          placementSpec: sql`excluded.placement_spec`,
          placement: sql`excluded.placement`,
          connectedAccountId: sql`excluded.connected_account_id`,
          workspaceId: sql`excluded.workspace_id`,
          permalinkUrl: sql`excluded.permalink_url`,
          publishingStatus: sql`excluded.publishing_status`,
          metrics: sql`excluded.metrics`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  protected mirrorConfig(): MirrorConfig {
    return {
      photoLabel: "ig-photo",
      videoThumbnailLabel: "ig-video-thumb",
      storagePrefix: "instagram/backfill",
      platformTag: "instagram",
    };
  }

  private async fetchPublishedMedia(
    ctx: InstagramIdentityContext,
    start: Date,
    end: Date,
  ): Promise<InstagramMedia[]> {
    const media: InstagramMedia[] = [];
    let after: string | undefined;
    let pageCount = 0;

    while (true) {
      pageCount++;
      this.step(`4.${pageCount}`, "Fetching media page", { page: pageCount });

      const response = await instagramGraphRequest<{
        data?: InstagramMedia[];
        paging?: { cursors?: { after?: string } };
      }>({ accessToken: ctx.accessToken }, `/${ctx.igAccountID}/media`, {
        searchParams: {
          fields: [
            "id",
            "caption",
            "media_type",
            "media_product_type",
            "media_url",
            "thumbnail_url",
            "timestamp",
            "permalink",
            "children{id,media_type,media_url,thumbnail_url}",
          ].join(","),
          limit: "50",
          after,
        },
      });

      const pageData = response.data ?? [];
      this.step(`4.${pageCount}a`, "Fetched media entries", {
        count: pageData.length,
      });
      media.push(...pageData);

      const paginationCursor = response.paging?.cursors?.after;
      if (!paginationCursor) {
        this.step(`4.${pageCount}b`, "No pagination cursor, ending");
        break;
      }
      after = paginationCursor;

      const oldest = pageData[pageData.length - 1];
      if (!oldest?.timestamp) continue;
      const oldestTime = new Date(oldest.timestamp);
      if (oldestTime < start) {
        this.step(`4.${pageCount}c`, "Oldest media before range, ending", {
          oldestTime: oldestTime.toISOString(),
        });
        break;
      }
    }

    this.step("4d", "Filtering media by range and product type", {
      total: media.length,
    });
    const filtered = media.filter((item) => {
      if (!item.timestamp) return false;
      const createdAt = new Date(item.timestamp);
      if (Number.isNaN(createdAt.getTime())) return false;
      if (createdAt < start || createdAt > end) return false;
      const productType = this.resolveMediaProductType(item.media_product_type);
      return productType === "FEED";
    });
    this.step("4e", "Media after filter", { remaining: filtered.length });
    return filtered;
  }

  private normalizeMedia(
    media: InstagramMedia,
  ): NormalizedInstagramPost | null {
    if (!media.id) {
      this.log.warn("skipping instagram media without id");
      return null;
    }
    if (!media.timestamp) {
      this.log.warn("skipping instagram media without timestamp", {
        id: media.id,
      });
      return null;
    }
    const createdAt = new Date(media.timestamp);
    if (Number.isNaN(createdAt.getTime())) {
      this.log.warn("skipping instagram media with invalid timestamp", {
        id: media.id,
        timestamp: media.timestamp,
      });
      return null;
    }

    const productType = this.resolveMediaProductType(media.media_product_type);
    if (productType !== "FEED") {
      return null;
    }

    const attachments = this.extractAttachments(media);
    return {
      id: media.id,
      createdAt,
      caption: media.caption ?? "",
      permalinkUrl: media.permalink,
      mediaType: media.media_type,
      productType,
      attachments,
    };
  }

  private extractAttachments(media: InstagramMedia): SharedAttachmentSpec[] {
    const attachments: SharedAttachmentSpec[] = [];
    const type = (media.media_type ?? "").toUpperCase();

    if (type === "CAROUSEL_ALBUM") {
      const children = media.children?.data ?? [];
      children.forEach((child, index) => {
        const attachment = this.childToAttachment(media.id, child, `${index}`);
        if (attachment) {
          attachments.push(attachment);
        }
      });
    } else {
      const attachment = this.mediaToAttachment(media, "0");
      if (attachment) {
        attachments.push(attachment);
      }
    }

    return attachments;
  }

  private mediaToAttachment(
    media: InstagramMedia,
    path: string,
  ): SharedAttachmentSpec | null {
    const type = (media.media_type ?? "").toUpperCase();
    const attachmentId = `${media.id}:${path}`;

    if (type === "IMAGE") {
      if (!media.media_url) return null;
      return {
        id: attachmentId,
        type: "photo",
        publicUrl: media.media_url,
        thumbnailUrl: media.media_url,
        metadata: {
          instagram: {
            id: media.id,
            media_type: media.media_type,
          },
        },
      };
    }

    if (type === "VIDEO") {
      if (!media.media_url) return null;
      return {
        id: attachmentId,
        type: "video",
        publicUrl: media.media_url,
        thumbnailUrl: media.thumbnail_url ?? undefined,
        metadata: {
          instagram: {
            id: media.id,
            media_type: media.media_type,
          },
        },
      };
    }

    return null;
  }

  private childToAttachment(
    mediaId: string,
    child: InstagramMediaChild,
    path: string,
  ): SharedAttachmentSpec | null {
    const type = (child.media_type ?? "").toUpperCase();
    const attachmentId = `${mediaId}:${path}`;

    if (type === "IMAGE") {
      if (!child.media_url) return null;
      return {
        id: attachmentId,
        type: "photo",
        publicUrl: child.media_url,
        thumbnailUrl: child.media_url,
        metadata: {
          instagram: {
            id: child.id,
            media_type: child.media_type,
          },
        },
      };
    }

    if (type === "VIDEO") {
      if (!child.media_url) return null;
      return {
        id: attachmentId,
        type: "video",
        publicUrl: child.media_url,
        thumbnailUrl: child.thumbnail_url ?? undefined,
        metadata: {
          instagram: {
            id: child.id,
            media_type: child.media_type,
          },
        },
      };
    }

    return null;
  }

  private resolveMediaProductType(raw: string | undefined): InstagramMediaType {
    const normalized = (raw ?? "FEED").toUpperCase();
    if (normalized === "REELS") return "REELS";
    if (normalized === "STORY") return "STORY";
    return "FEED";
  }

  private toUnifiedContentInsert(
    post: NormalizedInstagramPost,
    account: ConnectedAccountSelect,
    ctx: InstagramIdentityContext,
    metrics?: UnifiedContentMetrics,
  ): typeof unifiedContentTable.$inferInsert {
    const identityMetadata: Record<string, unknown> = {};
    if (post.permalinkUrl) identityMetadata.permalinkUrl = post.permalinkUrl;
    if (post.mediaType) identityMetadata.mediaType = post.mediaType;

    const placementSpec: IGFeedPlacementSpecType = {
      placement: IGPlacement.IG_FEED,
      caption: post.caption,
      attachments: post.attachments,
      identity: {
        connectedAccountID: account.id,
        igAccountID: ctx.igAccountID,
        metadata:
          Object.keys(identityMetadata).length > 0
            ? identityMetadata
            : undefined,
      },
      createdAt: post.createdAt,
    };

    const unifiedMetrics: UnifiedContentMetrics = metrics ?? {};

    return {
      placement: IGPlacement.IG_FEED,
      placementSpec,
      publishingStatus: "PUBLISHED",
      connectedAccountId: account.id,
      sourceContentId: post.id,
      permalinkUrl: post.permalinkUrl,
      workspaceId: account.workspaceId,
      createdAt: post.createdAt,
      updatedAt: post.createdAt,
      metrics: unifiedMetrics,
    } satisfies typeof unifiedContentTable.$inferInsert;
  }
}
