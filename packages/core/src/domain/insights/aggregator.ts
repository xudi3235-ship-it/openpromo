import { and, db, eq, sql } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import {
  contentMetricsSnapshotTable,
  type UnifiedContentSelect,
  UnifiedContentSelect as UnifiedContentSelectSchema,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import {
  inboxMessageStateTable,
  inboxMessageStatusEnum,
} from "@core/schemas/inbox-message-state.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import {
  ContentMetricsSummarySchema,
  InboxSummarySchema,
  type TimeSeriesPoint,
  TimeSeriesPointSchema,
  type WorkspaceSummary,
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

    if (range.end <= range.start) {
      return [];
    }

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
  }

  async getTopContent(params: {
    workspaceId: string;
    limit?: number;
    sortBy?: "impressions" | "engagement";
  }): Promise<UnifiedContentSelect[]> {
    const { workspaceId, limit = 5, sortBy = "impressions" } = params;

    const rows = await db()
      .select()
      .from(unifiedContentTable)
      .where(eq(unifiedContentTable.workspaceId, workspaceId))
      .orderBy(sql`COALESCE((metrics->>${sortBy})::numeric, 0) DESC`)
      .limit(limit);

    return rows.map((row) => UnifiedContentSelectSchema.parse(row));
  }

  async getInboxSummary(params: { workspaceId: string }) {
    const { workspaceId } = params;

    const [{ count: totalInboundMessages } = { count: 0 }] = await db()
      .select({ count: sql<number>`COUNT(*)` })
      .from(inboxMessagesTable)
      .innerJoin(
        inboxConversationsTable,
        eq(inboxMessagesTable.inboxConversationId, inboxConversationsTable.id),
      )
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .where(
        and(
          eq(connectedAccount.workspaceId, workspaceId),
          eq(inboxMessagesTable.sender, "user"),
        ),
      );

    const responseRows = await db()
      .select({
        conversationId: inboxConversationsTable.id,
        firstUserMessageAt: sql<Date | null>`
          MIN(CASE WHEN ${inboxMessagesTable.sender} = 'user'::sender THEN ${inboxMessagesTable.createdAt} END)
        `,
        firstSelfMessageAt: sql<Date | null>`
          MIN(CASE WHEN ${inboxMessagesTable.sender} = 'self'::sender THEN ${inboxMessagesTable.createdAt} END)
        `,
      })
      .from(inboxConversationsTable)
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .leftJoin(
        inboxMessagesTable,
        eq(inboxMessagesTable.inboxConversationId, inboxConversationsTable.id),
      )
      .where(eq(connectedAccount.workspaceId, workspaceId))
      .groupBy(inboxConversationsTable.id);

    const conversationsWithUserMessages = responseRows.filter(
      (row) => row.firstUserMessageAt instanceof Date,
    );

    const conversationsWithResponses = conversationsWithUserMessages.filter(
      (row) =>
        row.firstSelfMessageAt instanceof Date &&
        row.firstUserMessageAt instanceof Date &&
        row.firstSelfMessageAt.getTime() >= row.firstUserMessageAt.getTime(),
    );

    const responseDurationsMinutes = conversationsWithResponses
      .map((row) => {
        if (!row.firstSelfMessageAt || !row.firstUserMessageAt) return null;
        const diff =
          row.firstSelfMessageAt.getTime() - row.firstUserMessageAt.getTime();
        return diff >= 0 ? diff / 60000 : 0;
      })
      .filter((value): value is number => value !== null);

    const averageFirstResponseMinutes =
      responseDurationsMinutes.length > 0
        ? responseDurationsMinutes.reduce((sum, value) => sum + value, 0) /
          responseDurationsMinutes.length
        : null;

    const responseRate =
      conversationsWithUserMessages.length > 0
        ? conversationsWithResponses.length /
          conversationsWithUserMessages.length
        : 0;

    const inboundTotal = Number(totalInboundMessages ?? 0);

    const [{ count: openMessages } = { count: 0 }] = await db()
      .select({ count: sql<number>`COUNT(*)` })
      .from(inboxMessageStateTable)
      .where(
        and(
          eq(inboxMessageStateTable.workspaceId, workspaceId),
          eq(
            inboxMessageStateTable.status,
            inboxMessageStatusEnum.enumValues[0] ?? "open",
          ),
        ),
      );

    const openTotal = Number(openMessages ?? 0);

    return InboxSummarySchema.parse({
      totalConversations: responseRows.length,
      conversationsWithUserMessages: conversationsWithUserMessages.length,
      conversationsWithResponses: conversationsWithResponses.length,
      totalInboundMessages: inboundTotal,
      openMessages: openTotal,
      responseRate,
      averageFirstResponseMinutes,
    });
  }
}
