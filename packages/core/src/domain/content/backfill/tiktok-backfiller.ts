import { db } from "@core/database/db";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { TikTokContentMetricsProvider } from "@core/domain/content/metrics/providers";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type SharedAttachmentSpec,
  type TikTokFeedPlacementSpec as TikTokFeedPlacementSpecType,
  TikTokPlacement,
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

type TikTokVideoObject = {
  id: string;
  create_time?: number | string;
  share_url?: string;
  video_description?: string;
  cover_image_url?: string;
  duration?: number;
  height?: number;
  width?: number;
};

type TikTokVideoListResponse = {
  data?: {
    videos?: TikTokVideoObject[];
    cursor?: string;
    has_more?: boolean;
  };
  error?: {
    code?: string | number;
    message?: string;
    log_id?: string;
  };
};

type TikTokIdentityContext = {
  tiktokUserID: string;
  accessToken: string;
};

type TikTokBackfillContext = TikTokIdentityContext & {
  connectedAccountId: string;
};

type NormalizedTikTokVideo = NormalizedBackfillItem & {
  shareUrl?: string;
  description?: string;
  duration?: number;
};

export type TikTokBackfillParams = BackfillParams;
export type TikTokBackfillResult = BackfillResult;

type TikTokBackfillerDependencies = BaseBackfillerDependencies;

const VIDEO_LIST_FIELDS = [
  "id",
  "create_time",
  "share_url",
  "video_description",
  "cover_image_url",
  "duration",
  "height",
  "width",
  // metrics
  "like_count",
  "comment_count",
  "share_count",
  "view_count",
] as const;

const BASE_URL = "https://open.tiktokapis.com";

export class TikTokBackfiller extends BaseBackfiller<
  NormalizedTikTokVideo,
  TikTokBackfillContext,
  TikTokVideoObject
> {
  private readonly metricsProvider = new TikTokContentMetricsProvider();

  constructor(dependencies: TikTokBackfillerDependencies = {}) {
    super(
      { namespace: "tiktok-backfiller", consolePrefix: "TT" },
      dependencies,
    );
  }

  protected async assertPlatform(account: ConnectedAccountSelect) {
    if (account.platform !== "TIKTOK") {
      throw new Error(
        `connected account ${account.id} is not a TikTok account`,
      );
    }
  }

  protected async prepareAccount(account: ConnectedAccountSelect) {
    const tikTokAccount = await ConnectedAccount.fromTikTokAccountID(
      account.externalAccountId,
    );

    const context: TikTokBackfillContext = {
      tiktokUserID: tikTokAccount.externalAccountId,
      accessToken: tikTokAccount.encryptedAccessToken,
      connectedAccountId: tikTokAccount.id,
    };

    return { platformAccount: tikTokAccount, context };
  }

  protected contextLogData(context: TikTokBackfillContext) {
    return { tiktokUserID: context.tiktokUserID };
  }

  protected async fetchRawItems(
    context: TikTokBackfillContext,
    start: Date,
    end: Date,
  ): Promise<TikTokVideoObject[]> {
    return this.fetchPublishedVideos(context, start, end);
  }

  protected normalizeItem(
    video: TikTokVideoObject,
  ): NormalizedTikTokVideo | null {
    const createdAtSeconds =
      typeof video.create_time === "string"
        ? Number.parseInt(video.create_time, 10)
        : (video.create_time ?? null);
    if (!createdAtSeconds || Number.isNaN(createdAtSeconds)) {
      this.log.warn("skip tiktok video with invalid create_time", {
        id: video.id,
        create_time: video.create_time,
      });
      return null;
    }

    const createdAt = new Date(createdAtSeconds * 1000);
    if (Number.isNaN(createdAt.getTime())) {
      this.log.warn("skip tiktok video with invalid createdAt", {
        id: video.id,
        createTime: video.create_time,
      });
      return null;
    }

    const attachments: SharedAttachmentSpec[] = [];
    if (video.cover_image_url) {
      attachments.push({
        id: `${video.id}:cover`,
        type: "photo",
        publicUrl: video.cover_image_url,
        thumbnailUrl: video.cover_image_url,
        metadata: {
          tiktok: {
            type: "cover_image",
            sourceUrl: video.cover_image_url,
          },
        },
      });
    }

    return {
      id: video.id,
      createdAt,
      attachments,
      shareUrl: video.share_url,
      description: video.video_description ?? undefined,
      duration: typeof video.duration === "number" ? video.duration : undefined,
    };
  }

  protected async fetchMetrics(
    items: NormalizedTikTokVideo[],
    context: TikTokBackfillContext,
  ): Promise<Map<string, UnifiedContentMetrics>> {
    if (items.length === 0) {
      return new Map();
    }

    const targets = items.map((item) => ({
      id: item.id,
      placement: TikTokPlacement.TT_FEED,
      sourceContentId: item.id,
      connectedAccountId: context.connectedAccountId,
    }));

    const { successes, failures } =
      await this.metricsProvider.fetchBatch(targets);

    for (const failure of failures) {
      this.log.warn("failed to fetch tiktok metrics for video", {
        videoId: failure.contentId,
        reason: failure.reason,
      });
    }

    return new Map(
      successes.map((result) => [result.contentId, result.metrics]),
    );
  }

  protected async insertPosts(
    items: NormalizedTikTokVideo[],
    account: ConnectedAccountSelect,
    context: TikTokBackfillContext,
    metricsById: Map<string, UnifiedContentMetrics>,
  ): Promise<void> {
    if (items.length === 0) return;

    const values = items
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) =>
        this.toUnifiedContentInsert(
          item,
          account,
          context,
          metricsById.get(item.id),
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
      photoLabel: "tt-photo",
      videoThumbnailLabel: "tt-video-thumb",
      storagePrefix: "tiktok/backfill",
      platformTag: "tiktok",
    };
  }

  private async fetchPublishedVideos(
    ctx: TikTokBackfillContext,
    start: Date,
    end: Date,
  ): Promise<TikTokVideoObject[]> {
    const videos: TikTokVideoObject[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (true) {
      page += 1;
      this.step(`4.${page}`, "Fetching TikTok videos", { cursor });

      // Build URL with fields as query param
      const url = new URL("/v2/video/list/", BASE_URL);
      url.searchParams.set("fields", VIDEO_LIST_FIELDS.join(","));

      // Build POST body with pagination params
      const body: Record<string, unknown> = {
        max_count: 20,
      };
      if (cursor) {
        body.cursor = cursor;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log("// TikTok API response status", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Check if response is not ok first
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let errorBody: string;

        if (contentType.includes("application/json")) {
          try {
            const errorJson =
              (await response.json()) as TikTokVideoListResponse;
            errorBody = JSON.stringify(errorJson);
            this.log.warn("tiktok video list request failed (JSON error)", {
              status: response.status,
              statusText: response.statusText,
              error: errorJson.error,
            });
          } catch {
            errorBody = await response.text();
            this.log.warn("tiktok video list request failed (invalid JSON)", {
              status: response.status,
              statusText: response.statusText,
              body: errorBody,
            });
          }
        } else {
          errorBody = await response.text();
          this.log.warn("tiktok video list request failed (non-JSON)", {
            status: response.status,
            statusText: response.statusText,
            contentType,
            body: errorBody,
          });
        }
        break;
      }

      let json: TikTokVideoListResponse;
      try {
        json = (await response.json()) as TikTokVideoListResponse;
        console.log("// TikTok Video List Response", json);
      } catch (error) {
        const textBody = await response.text();
        this.log.warn("failed to parse tiktok video list response", {
          error: (error as Error).message,
          status: response.status,
          body: textBody.substring(0, 500), // First 500 chars
        });
        break;
      }

      const apiError = json.error;
      const hasError =
        apiError && apiError.code !== undefined && apiError.code !== "ok";
      if (hasError) {
        this.log.warn("tiktok video list request failed (API error)", {
          status: `${response.status} ${response.statusText}`,
          code: apiError?.code,
          message: apiError?.message,
          logId: apiError?.log_id,
        });
        break;
      }

      const pageVideos = json.data?.videos ?? [];
      videos.push(...pageVideos);

      const nextCursor = json.data?.cursor;
      const hasMore = Boolean(json.data?.has_more);
      cursor =
        typeof nextCursor === "string" && nextCursor.length > 0
          ? nextCursor
          : undefined;

      if (!hasMore || !cursor) {
        break;
      }

      const oldest = pageVideos[pageVideos.length - 1];
      if (oldest?.create_time) {
        const oldestSeconds =
          typeof oldest.create_time === "string"
            ? Number.parseInt(oldest.create_time, 10)
            : oldest.create_time;
        if (typeof oldestSeconds === "number" && !Number.isNaN(oldestSeconds)) {
          const oldestDate = new Date(oldestSeconds * 1000);
          if (oldestDate < start) {
            break;
          }
        }
      }
    }

    return videos.filter((video) => {
      const createdAtSeconds =
        typeof video.create_time === "string"
          ? Number.parseInt(video.create_time, 10)
          : (video.create_time ?? null);
      if (!createdAtSeconds || Number.isNaN(createdAtSeconds)) {
        return false;
      }
      const createdAt = new Date(createdAtSeconds * 1000);
      return createdAt >= start && createdAt <= end;
    });
  }

  private toUnifiedContentInsert(
    video: NormalizedTikTokVideo,
    account: ConnectedAccountSelect,
    ctx: TikTokBackfillContext,
    metrics?: UnifiedContentMetrics,
  ): typeof unifiedContentTable.$inferInsert {
    const placementSpec: TikTokFeedPlacementSpecType = {
      placement: TikTokPlacement.TT_FEED,
      caption: video.description,
      identity: {
        connectedAccountID: account.id,
        tiktokUserID: ctx.tiktokUserID,
        metadata: video.shareUrl
          ? {
              shareUrl: video.shareUrl,
            }
          : undefined,
      },
      attachments: video.attachments,
      createdAt: video.createdAt,
    };

    const unifiedMetrics: UnifiedContentMetrics = metrics ?? {};

    return {
      placement: TikTokPlacement.TT_FEED,
      placementSpec,
      publishingStatus: "PUBLISHED",
      connectedAccountId: account.id,
      sourceContentId: video.id,
      permalinkUrl: video.shareUrl,
      workspaceId: account.workspaceId,
      createdAt: video.createdAt,
      updatedAt: video.createdAt,
      metrics: unifiedMetrics,
    } satisfies typeof unifiedContentTable.$inferInsert;
  }
}
