import { and, db, eq, sql } from "@core/helpers/db";
import {
  contentMetricsSnapshotTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import type {
  TimeSeriesPoint,
  TopContentEntry,
  WorkspaceSummary,
} from "@shared/insights";
import {
  ContentMetricsSummarySchema,
  TimeSeriesPointSchema,
  TopContentEntrySchema,
  WorkspaceSummarySchema,
} from "@shared/insights";

export type InsightsTimeRange = {
  start: Date;
  end: Date;
};

export class WorkspaceInsightsAggregator {
  async getSummary(params: { workspaceId: string }): Promise<WorkspaceSummary> {
    const { workspaceId } = params;
    const rows = await db()
      .select({
        metrics: unifiedContentTable.metrics,
        metricsRefreshedAt: unifiedContentTable.metricsRefreshedAt,
      })
      .from(unifiedContentTable)
      .where(eq(unifiedContentTable.workspaceId, workspaceId));

    let lastRefreshedAt: Date | null = null;
    const totals = {
      impressions: 0,
      engagement: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    } satisfies WorkspaceSummary["totals"];

    for (const row of rows) {
      if (row.metricsRefreshedAt) {
        if (!lastRefreshedAt || row.metricsRefreshedAt > lastRefreshedAt) {
          lastRefreshedAt = row.metricsRefreshedAt;
        }
      }
      const parsed = ContentMetricsSummarySchema.safeParse(row.metrics ?? {});
      if (!parsed.success) continue;
      const metrics = parsed.data;
      totals.impressions += metrics.impressions ?? 0;
      totals.engagement += metrics.engagement ?? 0;
      totals.clicks += metrics.clicks ?? 0;
      totals.likes += metrics.likes ?? 0;
      totals.comments += metrics.comments ?? 0;
      totals.shares += metrics.shares ?? 0;
    }

    return WorkspaceSummarySchema.parse({
      totals,
      lastRefreshedAt,
    });
  }

  async getTimeSeries(params: {
    workspaceId: string;
    range: InsightsTimeRange;
    interval: "day" | "week";
  }): Promise<TimeSeriesPoint[]> {
    const { workspaceId, range, interval } = params;
    const bucketExpression =
      interval === "week"
        ? sql`DATE_TRUNC('week', ${contentMetricsSnapshotTable.collectedAt})`
        : sql`DATE_TRUNC('day', ${contentMetricsSnapshotTable.collectedAt})`;

    const rows = await db()
      .select({
        bucket: bucketExpression.as("bucket"),
        impressions: sql<number>`SUM((metrics->>'impressions')::numeric)`.as(
          "impressions",
        ),
        engagement: sql<number>`SUM((metrics->>'engagement')::numeric)`.as(
          "engagement",
        ),
      })
      .from(contentMetricsSnapshotTable)
      .where(
        and(
          eq(contentMetricsSnapshotTable.workspaceId, workspaceId),
          sql`${contentMetricsSnapshotTable.collectedAt} >= ${range.start}`,
          sql`${contentMetricsSnapshotTable.collectedAt} <= ${range.end}`,
        ),
      )
      .groupBy(bucketExpression)
      .orderBy(bucketExpression);

    return rows.map((row) => {
      const bucketRaw = row.bucket as Date | string;
      const bucketValue =
        bucketRaw instanceof Date ? bucketRaw : new Date(bucketRaw);
      return TimeSeriesPointSchema.parse({
        bucket: bucketValue,
        impressions: Number(row.impressions ?? 0),
        engagement: Number(row.engagement ?? 0),
      });
    });
  }

  async getTopContent(params: {
    workspaceId: string;
    limit?: number;
    sortBy?: "impressions" | "engagement";
  }): Promise<TopContentEntry[]> {
    const { workspaceId, limit = 5, sortBy = "impressions" } = params;

    const rows = await db()
      .select({
        id: unifiedContentTable.id,
        placement: unifiedContentTable.placement,
        metrics: unifiedContentTable.metrics,
        metricsRefreshedAt: unifiedContentTable.metricsRefreshedAt,
        sourceContentId: unifiedContentTable.sourceContentId,
      })
      .from(unifiedContentTable)
      .where(eq(unifiedContentTable.workspaceId, workspaceId))
      .orderBy(sql`(metrics->>${sortBy})::numeric DESC NULLS LAST`)
      .limit(limit);

    return rows
      .map((row) => {
        const metrics = ContentMetricsSummarySchema.safeParse(
          row.metrics ?? {},
        );
        if (!metrics.success) return null;
        return TopContentEntrySchema.parse({
          contentId: row.id,
          sourceContentId: row.sourceContentId ?? undefined,
          placement: row.placement,
          metrics: metrics.data,
          lastRefreshedAt: row.metricsRefreshedAt ?? undefined,
        });
      })
      .filter((entry): entry is TopContentEntry => Boolean(entry));
  }
}
