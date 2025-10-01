// backfill api.
// this contains core business logic for backfilling content data.
// it will fetch the contents from source platform, e.g. FB, IG, TT.
// and populate the the content to our DB. it will also dedup.
// we will copy the thumbnail to our storage.

import { randomUUID } from "node:crypto";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { FacebookIdentityContext } from "@core/domain/content/entity/facebook/api";
import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { and, db, eq, inArray } from "@core/helpers/db";
import { Storage } from "@core/helpers/storage";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type FBFeedPlacementSpec as FBFeedPlacementSpecType,
  FBPlacement,
  type SharedAttachmentSpec,
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

type FacebookPaging = {
  cursors?: {
    after?: string;
  };
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

type FacebookFeedResponse = {
  data?: FacebookFeedPost[];
  paging?: FacebookPaging;
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
};

export class FacebookBackfiller {
  private readonly fetch: typeof fetch;
  private readonly storage: typeof Storage;
  private readonly log: ReturnType<typeof Log.create>;

  constructor(dependencies: FacebookBackfillerDependencies = {}) {
    this.fetch = dependencies.fetch ?? fetch;
    this.storage = dependencies.storage ?? Storage;
    this.log =
      dependencies.logger ?? Log.create({ namespace: "facebook-backfiller" });
  }

  async backfill(
    params: FacebookBackfillParams,
  ): Promise<FacebookBackfillResult> {
    this.assertTimeRange(params.start, params.end);

    const { connectedAccountId, start, end } = params;
    const account = await ConnectedAccount.fromID(connectedAccountId);

    if (account.platform !== "FACEBOOK") {
      throw new Error(
        `connected account ${connectedAccountId} is not a Facebook account`,
      );
    }

    const facebookAccount = await ConnectedAccount.fromFBPageID(
      account.externalAccountId,
    );

    const ctx: FacebookIdentityContext = {
      pageID: facebookAccount.externalAccountId,
      accessToken: facebookAccount.encryptedAccessToken,
    };

    const posts = await this.fetchPublishedPosts(ctx, start, end);
    this.log.info("fetched facebook posts", {
      count: posts.length,
      pageID: ctx.pageID,
    });

    if (posts.length === 0) {
      return { fetched: 0, inserted: 0, skipped: 0 };
    }

    const normalized = posts
      .map((post) => this.normalizePost(post))
      .filter((post): post is NormalizedFacebookPost => Boolean(post));

    if (normalized.length === 0) {
      return { fetched: posts.length, inserted: 0, skipped: posts.length };
    }

    const deduped = await this.filterExisting(facebookAccount.id, normalized);
    if (deduped.toInsert.length === 0) {
      return {
        fetched: posts.length,
        inserted: 0,
        skipped: normalized.length,
      };
    }

    await this.mirrorAttachmentThumbnails(
      deduped.toInsert,
      facebookAccount.workspaceId,
    );

    await this.insertPosts(deduped.toInsert, facebookAccount, ctx);

    return {
      fetched: posts.length,
      inserted: deduped.toInsert.length,
      skipped: normalized.length - deduped.toInsert.length,
    };
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
    const posts: FacebookFeedPost[] = [];
    let after: string | undefined;

    while (true) {
      const response = await facebookGraphRequest<FacebookFeedResponse>(
        ctx,
        `/${ctx.pageID}/published_posts`,
        {
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
        },
      );

      const pageData = response.data ?? [];
      posts.push(...pageData);

      if (!response.paging?.cursors?.after) {
        break;
      }

      after = response.paging.cursors.after;

      const oldest = pageData[pageData.length - 1];
      if (!oldest) {
        break;
      }
      const oldestTime = new Date(oldest.created_time);
      if (oldestTime < start) {
        break;
      }
    }

    return posts.filter((post) => {
      const createdAt = new Date(post.created_time);
      return createdAt >= start && createdAt <= end;
    });
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
    const ids = posts.map((post) => post.id);
    if (ids.length === 0) {
      return {
        existing: new Set<string>(),
        toInsert: [] as NormalizedFacebookPost[],
      };
    }
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

    return { existing: existingSet, toInsert };
  }

  private async mirrorAttachmentThumbnails(
    posts: NormalizedFacebookPost[],
    workspaceId: string,
  ): Promise<void> {
    if (posts.length === 0) return;

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

          if (!mirrored) continue;

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

  private async insertPosts(
    posts: NormalizedFacebookPost[],
    account: ConnectedAccountSelect,
    ctx: FacebookIdentityContext,
  ) {
    const values = posts
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((post) => this.toUnifiedContentInsert(post, account, ctx));

    if (values.length === 0) return;

    await db().insert(unifiedContentTable).values(values);
  }

  private toUnifiedContentInsert(
    post: NormalizedFacebookPost,
    account: ConnectedAccountSelect,
    ctx: FacebookIdentityContext,
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

    return {
      placement: FBPlacement.FB_FEED,
      placementSpec,
      publishingStatus: "PUBLISHED",
      connectedAccountId: account.id,
      sourceContentId: post.id,
      workspaceId: account.workspaceId,
      createdAt: post.createdAt,
      updatedAt: post.createdAt,
    } satisfies typeof unifiedContentTable.$inferInsert;
  }
}
