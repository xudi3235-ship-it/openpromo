// backfill api.
// this contains core business logic for backfilling content data.
// it will fetch the contents from source platform, e.g. FB, IG, TT.
// and populate the the content to our DB. it will also dedup.
// we will copy the thumbnail to our storage.

import { randomUUID } from "node:crypto";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { FacebookIdentityContext } from "@core/domain/content/entity/facebook/api";
import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import {
  FACEBOOK_POST_DEFAULT_METRICS,
  FacebookPostMetricsFetcher,
  facebookPostMetricsToUnifiedContentMetrics,
} from "@core/domain/content/entity/facebook/postMetrics";
import { and, db, eq, inArray } from "@core/helpers/db";
import { Storage } from "@core/helpers/storage";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type FBFeedPlacementSpec as FBFeedPlacementSpecType,
  FBPlacement,
  type SharedAttachmentSpec,
  type UnifiedContentMetrics,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

type FacebookBackfillParams = {
  connectedAccountId: string;
  start: Date;
  end: Date;
};

type FacebookBackfillResult = {
  fetched: number;
  inserted: number;
  skipped: number;
};
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

type NormalizedFacebookPost = {
  id: string;
  createdAt: Date;
  message: string;
  permalinkUrl?: string;
  postType?: string;
  attachments: SharedAttachmentSpec[];
};

type FacebookBackfillerDependencies = {
  fetch?: typeof fetch;
  storage?: typeof Storage;
  logger?: ReturnType<typeof Log.create>;
  metricsFetcher?: FacebookPostMetricsFetcher;
};

export class FacebookBackfiller {
  private readonly fetch: typeof fetch;
  private readonly storage: typeof Storage;
  private readonly log: ReturnType<typeof Log.create>;
  private readonly metricsFetcher: FacebookPostMetricsFetcher;

  constructor(dependencies: FacebookBackfillerDependencies = {}) {
    this.fetch = dependencies.fetch ?? fetch;
    this.storage = dependencies.storage ?? Storage;
    this.log =
      dependencies.logger ?? Log.create({ namespace: "facebook-backfiller" });
    this.metricsFetcher =
      dependencies.metricsFetcher ?? new FacebookPostMetricsFetcher();
  }

  async backfill(
    params: FacebookBackfillParams,
  ): Promise<FacebookBackfillResult> {
    console.log("[1] Starting Facebook backfill");
    this.assertTimeRange(params.start, params.end);

    const { connectedAccountId, start, end } = params;
    console.log("[2] Loading connected account", { connectedAccountId });
    const account = await ConnectedAccount.fromID(connectedAccountId);

    if (account.platform !== "FACEBOOK") {
      throw new Error(
        `connected account ${connectedAccountId} is not a Facebook account`,
      );
    }

    console.log("[3] Resolving Facebook page account", {
      externalAccountId: account.externalAccountId,
    });
    const facebookAccount = await ConnectedAccount.fromFBPageID(
      account.externalAccountId,
    );

    const ctx: FacebookIdentityContext = {
      pageID: facebookAccount.externalAccountId,
      accessToken: facebookAccount.encryptedAccessToken,
    };

    console.log("[4] Fetching published posts", {
      pageID: ctx.pageID,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const posts = await this.fetchPublishedPosts(ctx, start, end);
    this.log.info("fetched facebook posts", {
      count: posts.length,
      pageID: ctx.pageID,
    });
    console.log("[5] Fetched posts", { count: posts.length });

    if (posts.length === 0) {
      console.log("[6] No posts fetched, returning early");
      return { fetched: 0, inserted: 0, skipped: 0 };
    }

    console.log("[7] Normalizing posts");
    const normalized = posts
      .map((post) => this.normalizePost(post))
      .filter((post): post is NormalizedFacebookPost => Boolean(post));
    console.log("[8] Normalized posts", {
      count: normalized.length,
      skipped: posts.length - normalized.length,
    });

    if (normalized.length === 0) {
      console.log("[9] No normalized posts, returning early");
      return { fetched: posts.length, inserted: 0, skipped: posts.length };
    }

    console.log("[10] Filtering existing posts");
    const deduped = await this.filterExisting(facebookAccount.id, normalized);
    console.log("[11] Deduplication result", {
      toInsert: deduped.toInsert.length,
      existing: deduped.existing.size,
    });

    const metricFetchTargets =
      deduped.toInsert.length > 0 ? deduped.toInsert : normalized;
    console.log("[11.5] Fetching metrics for candidate posts", {
      targetCount: metricFetchTargets.length,
      forInsertion: deduped.toInsert.length,
    });
    const metricsByPostId = await this.fetchMetricsForPosts(
      metricFetchTargets,
      ctx,
    );
    console.log("[11.6] Metrics fetch completed", {
      fetched: metricsByPostId.size,
    });

    if (deduped.toInsert.length === 0) {
      console.log("[12] All posts already exist, returning early");
      return {
        fetched: posts.length,
        inserted: 0,
        skipped: normalized.length,
      };
    }

    console.log("[13] Starting attachment thumbnail mirroring", {
      count: deduped.toInsert.length,
    });
    await this.mirrorAttachmentThumbnails(
      deduped.toInsert,
      facebookAccount.workspaceId,
    );
    console.log("[14] Attachment mirroring completed");

    console.log("[15] Inserting posts into database", {
      count: deduped.toInsert.length,
    });
    await this.insertPosts(
      deduped.toInsert,
      facebookAccount,
      ctx,
      metricsByPostId,
    );
    console.log("[16] Database insertion completed");

    const result = {
      fetched: posts.length,
      inserted: deduped.toInsert.length,
      skipped: normalized.length - deduped.toInsert.length,
    };
    console.log("[17] Backfill completed", result);
    return result;
  }

  private assertTimeRange(start: Date, end: Date) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new Error("start must be a valid Date");
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new Error("end must be a valid Date");
    }
    if (start.getTime() >= end.getTime()) {
      throw new Error("start must be before end");
    }
  }

  private async fetchPublishedPosts(
    ctx: FacebookIdentityContext,
    start: Date,
    end: Date,
  ): Promise<FacebookFeedPost[]> {
    console.log("[4.1] fetchPublishedPosts starting using /feed endpoint");
    const posts: FacebookFeedPost[] = [];
    let after: string | undefined;
    let pageCount = 0;

    // Use the /page_id/feed endpoint to get posts
    while (true) {
      pageCount++;
      console.log(`[4.1.${pageCount}] Fetching page ${pageCount}`);

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
            "attachments{media,type,target,id,subattachments}",
          ].join(","),
          limit: "50",
          since: Math.floor(start.getTime() / 1000).toString(),
          until: Math.ceil(end.getTime() / 1000).toString(),
          after,
        },
      });

      const pageData = response.data ?? [];
      console.log(
        `[4.1.${pageCount}a] Got ${pageData.length} posts on this page`,
      );
      posts.push(...pageData);

      if (!response.paging?.cursors?.after) {
        console.log(`[4.1.${pageCount}b] No more pages (no pagination cursor)`);
        break;
      }

      after = response.paging.cursors.after;

      const oldest = pageData[pageData.length - 1];
      if (!oldest) {
        console.log(`[4.1.${pageCount}c] Page empty, breaking`);
        break;
      }
      const oldestTime = new Date(oldest.created_time);
      if (oldestTime < start) {
        console.log(
          `[4.1.${pageCount}d] Oldest post before range (${oldestTime.toISOString()} < ${start.toISOString()}), breaking`,
        );
        break;
      }
    }

    console.log("[4.2] Filtering posts by date range", { total: posts.length });
    const filtered = posts.filter((post) => {
      const createdAt = new Date(post.created_time);
      return createdAt >= start && createdAt <= end;
    });
    console.log("[4.3] After date filter", { remaining: filtered.length });

    return filtered;
  }

  private normalizePost(post: FacebookFeedPost): NormalizedFacebookPost | null {
    const createdAt = new Date(post.created_time);
    if (Number.isNaN(createdAt.getTime())) {
      console.log("[7.1] Skipping post with invalid date", { id: post.id });
      this.log.warn("skip facebook post with invalid created_time", {
        id: post.id,
      });
      return null;
    }

    const attachments = this.extractAttachments(post);
    console.log("[7.2] Normalized post", {
      id: post.id,
      attachmentCount: attachments.length,
      hasMessage: !!post.message,
    });

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
    console.log("[7.2.1] Extracting attachments", {
      postId: post.id,
      attachmentCount: attachments.length,
    });

    const visit = (attachment: FacebookAttachment, path: string) => {
      const spec = this.attachmentToSpec(post.id, attachment, path);
      if (spec) {
        console.log(`[7.2.1.${path}] Converted attachment`, {
          type: spec.type,
          path,
        });
        collected.push(spec);
      }

      const subattachments = attachment.subattachments?.data ?? [];
      if (subattachments.length > 0) {
        console.log(
          `[7.2.1.${path}a] Found ${subattachments.length} subattachments`,
        );
      }
      subattachments.forEach((subAttachment, index) => {
        visit(subAttachment, `${path}.${index}`);
      });
    };

    attachments.forEach((attachment, index) => {
      visit(attachment, `${index}`);
    });

    console.log("[7.2.1z] Attachment extraction complete", {
      postId: post.id,
      totalCollected: collected.length,
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
      } satisfies SharedAttachmentSpec;
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
      } satisfies SharedAttachmentSpec;
    }

    return null;
  }

  private async filterExisting(
    connectedAccountId: string,
    posts: NormalizedFacebookPost[],
  ) {
    console.log("[10.1] Starting deduplication check", {
      connectedAccountId,
      postsToCheck: posts.length,
    });
    const ids = posts.map((post) => post.id);
    if (ids.length === 0) {
      console.log("[10.1a] No posts to check");
      return {
        existing: new Set<string>(),
        toInsert: [] as NormalizedFacebookPost[],
      };
    }
    console.log("[10.2] Querying database for existing posts");
    const existing = await db()
      .select({ sourceContentId: unifiedContentTable.sourceContentId })
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.connectedAccountId, connectedAccountId),
          inArray(unifiedContentTable.sourceContentId, ids),
        ),
      );

    const existingSet = new Set(
      existing
        .map((row) => row.sourceContentId)
        .filter((value): value is string => Boolean(value)),
    );

    const toInsert = posts.filter((post) => !existingSet.has(post.id));
    console.log("[10.3] Deduplication result", {
      checked: posts.length,
      alreadyExist: existingSet.size,
      toInsert: toInsert.length,
    });

    return { existing: existingSet, toInsert };
  }

  private async mirrorAttachmentThumbnails(
    posts: NormalizedFacebookPost[],
    workspaceId: string,
  ): Promise<void> {
    console.log("[13.1] Starting attachment thumbnail mirroring", {
      posts: posts.length,
      workspaceId,
    });
    if (posts.length === 0) {
      console.log("[13.1a] No posts to mirror");
      return;
    }

    const cache = new Map<
      string,
      { key: string; url: string; contentType: string }
    >();

    for (const post of posts) {
      for (let index = 0; index < post.attachments.length; index += 1) {
        const attachment = post.attachments[index];

        if (attachment.type === "photo") {
          const sourceUrl = attachment.publicUrl ?? attachment.thumbnailUrl;
          if (!sourceUrl) continue;

          console.log(`[13.1.${post.id}.${index}] Mirroring photo`, {
            sourceUrl: sourceUrl.substring(0, 50),
          });
          const mirrored = await this.mirrorUrlToR2(
            cache,
            sourceUrl,
            workspaceId,
            {
              label: "photo",
              postId: post.id,
              attachmentId: attachment.id ?? `${index}`,
            },
          );

          if (!mirrored) {
            console.log(`[13.1.${post.id}.${index}a] Mirror failed`);
            continue;
          }

          attachment.publicUrl = mirrored.url;
          attachment.thumbnailUrl = mirrored.url;
          attachment.metadata = this.mergeAttachmentMetadata(
            attachment.metadata,
            {
              r2: {
                bucket: this.storage.PUBLIC_BUCKET.name,
                key: mirrored.key,
                contentType: mirrored.contentType,
              },
            },
          );
        } else if (attachment.type === "video") {
          const thumbnailUrl = attachment.thumbnailUrl;
          if (!thumbnailUrl) continue;

          console.log(`[13.1.${post.id}.${index}] Mirroring video thumbnail`, {
            sourceUrl: thumbnailUrl.substring(0, 50),
          });
          const mirrored = await this.mirrorUrlToR2(
            cache,
            thumbnailUrl,
            workspaceId,
            {
              label: "video-thumb",
              postId: post.id,
              attachmentId: attachment.id ?? `${index}`,
              defaultExtension: "jpg",
            },
          );

          if (!mirrored) continue;

          attachment.thumbnailUrl = mirrored.url;
          attachment.metadata = this.mergeAttachmentMetadata(
            attachment.metadata,
            {
              r2Thumbnail: {
                bucket: this.storage.PUBLIC_BUCKET.name,
                key: mirrored.key,
                contentType: mirrored.contentType,
              },
            },
          );
        }
      }
    }
  }

  private async mirrorUrlToR2(
    cache: Map<string, { key: string; url: string; contentType: string }>,
    sourceUrl: string,
    workspaceId: string,
    context: {
      label: string;
      postId: string;
      attachmentId: string;
      defaultExtension?: string;
    },
  ): Promise<{ key: string; url: string; contentType: string } | null> {
    const cached = cache.get(sourceUrl);
    if (cached) return cached;

    try {
      const response = await this.fetch(sourceUrl);
      if (!response.ok || !response.body) {
        this.log.warn("failed to fetch attachment for mirroring", {
          sourceUrl,
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const contentTypeHeader = response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim();
      const contentType = contentTypeHeader ?? "image/jpeg";
      const extension =
        this.extensionFromContentType(contentType) ??
        context.defaultExtension ??
        "jpg";

      const fileName = `${context.label}-${context.postId}-${context.attachmentId}-${randomUUID()}.${extension}`;
      const key = this.storage.Key.workspace(
        workspaceId,
        "facebook/backfill",
        fileName,
      );

      const upload = await this.storage.upload(
        key,
        response.body as ReadableStream<Uint8Array>,
        this.storage.PUBLIC_BUCKET,
        {
          contentType,
          metadata: {
            workspaceId,
            platform: "facebook",
            sourceUrl,
            postId: context.postId,
            attachmentId: context.attachmentId,
            label: context.label,
          },
        },
      );

      const result = {
        key: upload.key,
        url: upload.url,
        contentType,
      };

      cache.set(sourceUrl, result);
      return result;
    } catch (error) {
      this.log.warn("failed to mirror attachment to R2", {
        sourceUrl,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private extensionFromContentType(contentType: string | null | undefined) {
    if (!contentType) return null;
    const normalized = contentType.toLowerCase();
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    return map[normalized] ?? null;
  }

  private mergeAttachmentMetadata(
    metadata: SharedAttachmentSpec["metadata"],
    extra: Record<string, unknown>,
  ): Record<string, unknown> {
    const base = (metadata as Record<string, unknown> | undefined) ?? {};
    return {
      ...base,
      storage: {
        ...((base.storage as Record<string, unknown>) ?? {}),
        ...extra,
      },
    } satisfies Record<string, unknown>;
  }

  private async fetchMetricsForPosts(
    posts: NormalizedFacebookPost[],
    ctx: FacebookIdentityContext,
  ): Promise<Map<string, UnifiedContentMetrics>> {
    const results = new Map<string, UnifiedContentMetrics>();
    if (posts.length === 0) return results;

    console.log("[14.5] Fetching facebook metrics for posts", {
      count: posts.length,
    });

    for (const post of posts) {
      try {
        const response = await this.metricsFetcher.fetch(
          { accessToken: ctx.accessToken },
          {
            postId: post.id,
            metrics: Array.from(FACEBOOK_POST_DEFAULT_METRICS),
            period: "lifetime",
          },
        );

        results.set(
          post.id,
          facebookPostMetricsToUnifiedContentMetrics(response.metrics),
        );
        console.log("[14.5a] Fetched metrics for post", {
          postId: post.id,
          metricCount: Object.keys(response.metrics).length,
        });
      } catch (error) {
        this.log.warn("failed to fetch facebook metrics for post", {
          postId: post.id,
          message: error instanceof Error ? error.message : String(error),
        });
        console.log("[14.5e] Failed to fetch metrics for post", {
          postId: post.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("[14.5z] Completed facebook metrics fetch for posts", {
      fetched: results.size,
      requested: posts.length,
    });

    return results;
  }

  private async insertPosts(
    posts: NormalizedFacebookPost[],
    account: ConnectedAccountSelect,
    ctx: FacebookIdentityContext,
    metricsByPostId: Map<string, UnifiedContentMetrics>,
  ) {
    if (posts.length === 0) return;

    const values = posts
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((post) =>
        this.toUnifiedContentInsert(
          post,
          account,
          ctx,
          metricsByPostId.get(post.id),
        ),
      );

    await db().insert(unifiedContentTable).values(values);
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
