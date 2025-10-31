import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import {
  INSTAGRAM_MEDIA_DEFAULT_METRICS,
  InstagramMediaInsightsFetcher,
  instagramMediaMetricsToUnifiedContentMetrics,
} from "@core/domain/content/entity/instagram/mediaInsights";
import { defineEvent } from "@core/experimental/event";
import { and, db, eq, gt, lt, withPagination } from "@core/helpers/db";
import {
  type IGFeedPlacementSpec,
  IGPlacement,
  type SharedAttachmentSpec,
  type UnifiedContentUpdate,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { NotImplementedError } from "@core/utils/error";
import { sql } from "drizzle-orm";
import * as z from "zod";
import { Actor } from "../../helpers/actor";

export namespace UnifiedContent {
  export const Event = {
    Created: defineEvent(
      "unified_content.created",
      z.object({
        id: z.string(),
      }),
    ),
  };

  /**
   * List a workspace's all unified content. This only returns from the current db. For backfilling/syncing, use the other apis.
   *
   * This is a expensive api, we enforce time range based filtering and pagination.
   */
  export async function list(
    page: number,
    limit: number = 10,
    byTimeRange: {
      start: Date;
      end: Date;
    },
  ) {
    // dynamic query building: https://orm.drizzle.team/docs/dynamic-query-building
    const workspaceId = Actor.workspaceID();
    const query = db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          // by default we use created at. This is trivial for scheduled & drafts
          // for published contents, it's backfilled.
          gt(unifiedContentTable.createdAt, byTimeRange.start),
          lt(unifiedContentTable.createdAt, byTimeRange.end),
        ),
      )
      .$dynamic();

    return withPagination(query, page, limit);
  }

  export async function getBySourceContentId(
    sourceContentId: string,
    // skip workspace check is used for webhooks
    { skipWorkspaceCheck = false },
  ) {
    const [content] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.sourceContentId, sourceContentId),
          skipWorkspaceCheck
            ? undefined
            : eq(unifiedContentTable.workspaceId, Actor.workspaceID()),
        ),
      )
      .limit(1);
    return content;
  }

  export async function getByID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [content] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .limit(1);
    return content;
  }

  export async function deleteByID(id: string) {
    const workspaceId = Actor.workspaceID();
    await db()
      .delete(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .execute();
  }

  export async function updateByID(
    id: string,
    data: z.infer<typeof UnifiedContentUpdate>,
  ) {
    const workspaceId = Actor.workspaceID();
    await db()
      .update(unifiedContentTable)
      .set(data)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .execute();
  }

  export async function create(data: typeof unifiedContentTable.$inferInsert) {
    const workspaceId = Actor.workspaceID();
    await db()
      .insert(unifiedContentTable)
      .values({
        ...data,
        workspaceId,
      })
      .execute();
  }

  // --------------- backfilling apis ---------------
  // for a newly connected account, we do lazy rehydration. this is primarily for some on-demand backfill use cases.
  export async function fromFacebookPost() {
    throw new NotImplementedError(
      "from a published FB post, backfill a unified content record",
    );
  }
  type InstagramMediaResponse = {
    id: string;
    caption?: string;
    media_type?: string;
    media_product_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    timestamp?: string;
    permalink?: string;
  };

  export async function fromInstagramPost(
    mediaId: string,
    params: {
      accessToken: string;
      connectedAccountId: string;
      workspaceId: string;
      igAccountId: string;
    },
  ) {
    const media = await instagramGraphRequest<InstagramMediaResponse>(
      {
        accessToken: params.accessToken,
        rateLimitKey: `instagram:${params.connectedAccountId}`,
      },
      `/${mediaId}`,
      {
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
          ].join(","),
        },
      },
    ).catch((error) => {
      console.error("[UnifiedContent] failed to fetch instagram media", {
        mediaId,
        error,
      });
      return null;
    });

    if (!media?.id) {
      return null;
    }

    const createdAt = media.timestamp ? new Date(media.timestamp) : new Date();
    if (Number.isNaN(createdAt.getTime())) {
      createdAt.setTime(Date.now());
    }

    const type = (media.media_type ?? "").toUpperCase();
    let attachment: SharedAttachmentSpec | undefined;
    if (media.media_url) {
      if (type === "VIDEO") {
        attachment = {
          id: `${media.id}:0`,
          type: "video",
          publicUrl: media.media_url,
          thumbnailUrl: media.thumbnail_url ?? media.media_url,
        } satisfies SharedAttachmentSpec;
      } else {
        attachment = {
          id: `${media.id}:0`,
          type: "photo",
          publicUrl: media.media_url,
          thumbnailUrl: media.media_url,
        } satisfies SharedAttachmentSpec;
      }
    }

    const identityMetadata: Record<string, unknown> = {};
    if (media.permalink) identityMetadata.permalinkUrl = media.permalink;
    if (media.media_type) identityMetadata.mediaType = media.media_type;

    const placementSpec: IGFeedPlacementSpec = {
      placement: IGPlacement.IG_FEED,
      caption: media.caption ?? undefined,
      attachments: attachment ? [attachment] : undefined,
      identity: {
        connectedAccountID: params.connectedAccountId,
        igAccountID: params.igAccountId,
        metadata:
          Object.keys(identityMetadata).length > 0
            ? identityMetadata
            : undefined,
      },
      createdAt,
    };

    // Fetch insights metrics for the media
    const insightsFetcher = new InstagramMediaInsightsFetcher();
    let metrics = {};
    let metricsRefreshedAt: Date | null = null;

    try {
      console.info("[UnifiedContent] backfilling insights for media", {
        mediaId,
      });
      const insightsResult = await insightsFetcher.fetch(
        {
          accessToken: params.accessToken,
          rateLimitKey: `instagram:${params.connectedAccountId}`,
        },
        {
          mediaId,
          metrics: Array.from(INSTAGRAM_MEDIA_DEFAULT_METRICS.FEED),
          metricBreakdowns: {
            profile_activity: "action_type",
          },
        },
      );
      metrics = instagramMediaMetricsToUnifiedContentMetrics(
        insightsResult.metrics,
      );
      metricsRefreshedAt = new Date();
      console.info("[UnifiedContent] successfully fetched insights", {
        mediaId,
        metrics,
      });
    } catch (error) {
      console.warn("[UnifiedContent] failed to fetch insights for media", {
        mediaId,
        error,
      });
      // Continue without metrics if insights fetch fails
    }

    const row = {
      placement: IGPlacement.IG_FEED,
      placementSpec,
      publishingStatus: "PUBLISHED" as const,
      connectedAccountId: params.connectedAccountId,
      sourceContentId: media.id,
      permalinkUrl: media.permalink ?? null,
      workspaceId: params.workspaceId,
      createdAt,
      updatedAt: createdAt,
      metrics,
      metricsRefreshedAt,
    } satisfies typeof unifiedContentTable.$inferInsert;

    const [upserted] = await db()
      .insert(unifiedContentTable)
      .values(row)
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
          metricsRefreshedAt: sql`excluded.metrics_refreshed_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning();

    return upserted ?? null;
  }
}
