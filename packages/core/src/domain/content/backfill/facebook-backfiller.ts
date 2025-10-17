import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { FacebookIdentityContext } from "@core/domain/content/entity/facebook/api";
import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import {
  FACEBOOK_POST_DEFAULT_METRICS,
  FacebookPostMetricsFetcher,
  facebookPostMetricsToUnifiedContentMetrics,
} from "@core/domain/content/entity/facebook/postMetrics";
import { db } from "@core/helpers/db";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type FBFeedPlacementSpec as FBFeedPlacementSpecType,
  FBPlacement,
  type SharedAttachmentSpec,
  type UnifiedContentMetrics,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import type {
  BackfillParams,
  BackfillResult,
  BaseBackfillerDependencies,
  MirrorConfig,
  NormalizedBackfillItem,
} from "./base-backfiller";
import { BaseBackfiller } from "./base-backfiller";

type FacebookAttachment = {
  id?: string;
  type?: string;
  target?: { id?: string };
  media?: {
    image?: { src?: string };
    source?: string;
  };
  subattachments?: { data?: FacebookAttachment[] };
};

type FacebookFeedPost = {
  id: string;
  created_time: string;
  message?: string;
  permalink_url?: string;
  type?: string;
  attachments?: {
    data?: FacebookAttachment[];
  };
};

type NormalizedFacebookPost = NormalizedBackfillItem & {
  message: string;
  permalinkUrl?: string;
  postType?: string;
};

export type FacebookBackfillParams = BackfillParams;
export type FacebookBackfillResult = BackfillResult;

type FacebookBackfillerDependencies = BaseBackfillerDependencies & {
  metricsFetcher?: FacebookPostMetricsFetcher;
};

export class FacebookBackfiller extends BaseBackfiller<
  NormalizedFacebookPost,
  FacebookIdentityContext,
  FacebookFeedPost
> {
  private readonly metricsFetcher: FacebookPostMetricsFetcher;

  constructor(dependencies: FacebookBackfillerDependencies = {}) {
    const { metricsFetcher, ...baseDeps } = dependencies;
    super({ namespace: "facebook-backfiller", consolePrefix: "" }, baseDeps);
    this.metricsFetcher = metricsFetcher ?? new FacebookPostMetricsFetcher();
  }

  protected async assertPlatform(account: ConnectedAccountSelect) {
    if (account.platform !== "FACEBOOK") {
      throw new Error(
        `connected account ${account.id} is not a Facebook account`,
      );
    }
  }

  protected async prepareAccount(account: ConnectedAccountSelect) {
    const facebookAccount = await ConnectedAccount.fromFBPageID(
      account.externalAccountId,
    );

    const context: FacebookIdentityContext = {
      pageID: facebookAccount.externalAccountId,
      accessToken: facebookAccount.encryptedAccessToken,
    };

    return { platformAccount: facebookAccount, context };
  }

  protected contextLogData(context: FacebookIdentityContext) {
    return { pageID: context.pageID };
  }

  protected async fetchRawItems(
    context: FacebookIdentityContext,
    start: Date,
    end: Date,
  ): Promise<FacebookFeedPost[]> {
    return this.fetchPublishedPosts(context, start, end);
  }

  protected normalizeItem(
    post: FacebookFeedPost,
  ): NormalizedFacebookPost | null {
    return this.normalizePost(post);
  }

  protected async fetchMetrics(
    posts: NormalizedFacebookPost[],
    context: FacebookIdentityContext,
  ): Promise<Map<string, UnifiedContentMetrics>> {
    const metrics = new Map<string, UnifiedContentMetrics>();

    for (const post of posts) {
      try {
        const response = await this.metricsFetcher.fetch(context, {
          postId: post.id,
          metrics: Array.from(FACEBOOK_POST_DEFAULT_METRICS),
          period: "lifetime",
        });
        metrics.set(
          post.id,
          facebookPostMetricsToUnifiedContentMetrics(response.metrics),
        );
      } catch (error) {
        this.log.warn("failed to fetch facebook metrics for post", {
          postId: post.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return metrics;
  }

  protected async insertPosts(
    posts: NormalizedFacebookPost[],
    account: ConnectedAccountSelect,
    context: FacebookIdentityContext,
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

    await db().insert(unifiedContentTable).values(values);
  }

  protected mirrorConfig(): MirrorConfig {
    return {
      photoLabel: "photo",
      videoThumbnailLabel: "video-thumb",
      storagePrefix: "facebook/backfill",
      platformTag: "facebook",
    };
  }

  private async fetchPublishedPosts(
    ctx: FacebookIdentityContext,
    start: Date,
    end: Date,
  ): Promise<FacebookFeedPost[]> {
    const posts: FacebookFeedPost[] = [];
    let after: string | undefined;
    let pageCount = 0;

    while (true) {
      pageCount++;
      this.step(`4.${pageCount}`, "Fetching feed page", { page: pageCount });

      const response = await facebookGraphRequest<{
        data?: FacebookFeedPost[];
        paging?: { cursors?: { after?: string } };
      }>(ctx, `/${ctx.pageID}/feed`, {
        searchParams: {
          fields: [
            "id",
            "message",
            "created_time",
            "permalink_url",
            "type",
            "attachments{media,type,target,id,subattachments}",
          ].join(","),
          limit: "50",
          since: Math.floor(start.getTime() / 1000).toString(),
          until: Math.ceil(end.getTime() / 1000).toString(),
          after,
        },
      });

      const pageData = response.data ?? [];
      this.step(`4.${pageCount}a`, "Fetched page items", {
        count: pageData.length,
      });
      posts.push(...pageData);

      const paginationCursor = response.paging?.cursors?.after;
      if (!paginationCursor) {
        this.step(`4.${pageCount}b`, "No pagination cursor, ending");
        break;
      }

      after = paginationCursor;

      const oldest = pageData[pageData.length - 1];
      if (!oldest) continue;
      const oldestTime = new Date(oldest.created_time);
      if (oldestTime < start) {
        this.step(`4.${pageCount}c`, "Oldest post before range, ending", {
          oldestTime: oldestTime.toISOString(),
        });
        break;
      }
    }

    this.step("4d", "Filtering posts by range", { total: posts.length });
    const filtered = posts.filter((post) => {
      const createdAt = new Date(post.created_time);
      return createdAt >= start && createdAt <= end;
    });
    this.step("4e", "Posts after filter", { remaining: filtered.length });
    return filtered;
  }

  private normalizePost(post: FacebookFeedPost): NormalizedFacebookPost | null {
    const createdAt = new Date(post.created_time);
    if (Number.isNaN(createdAt.getTime())) {
      this.log.warn("skip facebook post with invalid created_time", {
        id: post.id,
      });
      return null;
    }

    const attachments = this.extractAttachments(post);
    return {
      id: post.id,
      createdAt,
      message: post.message ?? "",
      permalinkUrl: post.permalink_url,
      postType: post.type,
      attachments,
    };
  }

  private extractAttachments(post: FacebookFeedPost): SharedAttachmentSpec[] {
    const collected: SharedAttachmentSpec[] = [];
    const attachments = post.attachments?.data ?? [];

    const visit = (attachment: FacebookAttachment, path: string) => {
      const spec = this.attachmentToSpec(post.id, attachment, path);
      if (spec) {
        collected.push(spec);
      }

      const subattachments = attachment.subattachments?.data ?? [];
      subattachments.forEach((subAttachment, index) => {
        visit(subAttachment, `${path}.${index}`);
      });
    };

    attachments.forEach((attachment, index) => {
      visit(attachment, `${index}`);
    });

    return collected;
  }

  private attachmentToSpec(
    postId: string,
    attachment: FacebookAttachment,
    path: string,
  ): SharedAttachmentSpec | null {
    const rawType = (attachment.type ?? "").toLowerCase();
    if (!rawType) return null;

    const attachmentId =
      attachment.target?.id || attachment.id || `${postId}:${path}`;

    if (rawType.includes("video")) {
      const videoUrl = attachment.media?.source;
      if (!videoUrl) return null;
      return {
        id: attachmentId,
        type: "video",
        publicUrl: videoUrl,
        thumbnailUrl: attachment.media?.image?.src,
        metadata: {
          facebook: {
            id: attachmentId,
            type: attachment.type,
          },
        },
      };
    }

    if (rawType.includes("photo") || rawType.includes("album")) {
      const imageUrl = attachment.media?.image?.src;
      if (!imageUrl) return null;
      return {
        id: attachmentId,
        type: "photo",
        publicUrl: imageUrl,
        thumbnailUrl: imageUrl,
        metadata: {
          facebook: {
            id: attachmentId,
            type: attachment.type,
          },
        },
      };
    }

    return null;
  }

  private toUnifiedContentInsert(
    post: NormalizedFacebookPost,
    account: ConnectedAccountSelect,
    ctx: FacebookIdentityContext,
    metrics?: UnifiedContentMetrics,
  ): typeof unifiedContentTable.$inferInsert {
    const identityMetadata: Record<string, unknown> = {};
    if (post.permalinkUrl) identityMetadata.permalinkUrl = post.permalinkUrl;
    if (post.postType) identityMetadata.postType = post.postType;

    const placementSpec: FBFeedPlacementSpecType = {
      placement: FBPlacement.FB_FEED,
      postSpec: {
        message: post.message,
      },
      identity: {
        connectedAccountID: account.id,
        fbPageID: ctx.pageID,
        metadata:
          Object.keys(identityMetadata).length > 0
            ? identityMetadata
            : undefined,
      },
      attachments: post.attachments,
      createdAt: post.createdAt,
    };

    const unifiedMetrics: UnifiedContentMetrics = metrics ?? {};

    return {
      placement: FBPlacement.FB_FEED,
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
