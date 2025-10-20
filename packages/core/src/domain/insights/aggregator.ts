import type {
  TimeSeriesPoint,
  TopContentEntry,
  WorkspaceSummary,
} from "@shared/insights";
import { WorkspaceSummarySchema } from "@shared/insights";

export type InsightsTimeRange = {
  start: Date;
  end: Date;
};

export class WorkspaceInsightsAggregator {
  async getSummary(_params: {
    workspaceId: string;
  }): Promise<WorkspaceSummary> {
    // TODO: Remove mock data once we have real metrics
    return WorkspaceSummarySchema.parse({
      totals: {
        impressions: 145230,
        engagement: 8542,
        clicks: 3421,
        likes: 4231,
        comments: 892,
        shares: 1998,
      },
      lastRefreshedAt: new Date(),
    });

    // Real implementation (commented out for now)
    /*
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
    */
  }

  async getTimeSeries(params: {
    workspaceId: string;
    range: InsightsTimeRange;
    interval: "day" | "week";
  }): Promise<TimeSeriesPoint[]> {
    const { range, interval } = params;

    // TODO: Remove mock data once we have real metrics
    // Generate mock data for now
    const mockData: TimeSeriesPoint[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const intervalMs = interval === "week" ? dayMs * 7 : dayMs;

    const startTime = range.start.getTime();
    console.log(
      "hit getTimeSeries with start:",
      range.start,
      "end:",
      range.end,
      "interval:",
      interval,
    );

    let currentTime = startTime;
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    while (iterations < maxIterations) {
      mockData.push({
        bucket: new Date(currentTime),
        impressions: Math.floor(Math.random() * 10000) + 5000,
        engagement: Math.floor(Math.random() * 500) + 100,
      });
      currentTime += intervalMs;
      iterations++;
    }
    console.log("generated", mockData.length, "data points");

    return mockData;

    // Real implementation (commented out for now)
    /*
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
          sql`${contentMetricsSnapshotTable.collectedAt} >= ${range.start.toISOString()}`,
          sql`${contentMetricsSnapshotTable.collectedAt} <= ${range.end.toISOString()}`,
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
    */
  }

  async getTopContent(params: {
    workspaceId: string;
    limit?: number;
    sortBy?: "impressions" | "engagement";
  }): Promise<TopContentEntry[]> {
    const { limit = 5 } = params;

    // TODO: Remove mock data once we have real metrics
    const mockContent: TopContentEntry[] = Array.from(
      { length: limit },
      (_, i) => ({
        contentId: `content-${i + 1}`,
        sourceContentId: `source-${i + 1}`,
        placement:
          ["facebook", "instagram", "twitter", "linkedin"][i % 4] || "facebook",
        metrics: {
          impressions: Math.floor(Math.random() * 50000) + 10000,
          engagement: Math.floor(Math.random() * 2000) + 500,
          clicks: Math.floor(Math.random() * 1000) + 100,
          likes: Math.floor(Math.random() * 1500) + 200,
          comments: Math.floor(Math.random() * 300) + 50,
          shares: Math.floor(Math.random() * 500) + 50,
        },
        lastRefreshedAt: new Date(),
      }),
    );

    return mockContent;

    // Real implementation (commented out for now)
    /*
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
    */
  }
}
