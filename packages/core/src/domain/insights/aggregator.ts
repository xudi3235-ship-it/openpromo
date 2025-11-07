import { and, db, desc, eq, inArray, sql } from "@core/database/db";
import {
  createTransaction,
  type Transaction,
} from "@core/database/transaction";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { connectedAccountMetricsSnapshotTable } from "@core/schemas/connected-account-metrics.sql";
import {
  contentMetricsSnapshotTable,
  type UnifiedContentSelect,
  UnifiedContentSelect as UnifiedContentSelectSchema,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import {
  type insightEventSeverityEnum,
  insightEventsTable,
  type insightEventTypeEnum,
  workspaceInsightSnapshotsTable,
} from "@core/schemas/insights.sql";
import {
  type WorkspaceGoalSelect,
  workspaceGoalProgressTable,
  workspaceGoalsTable,
} from "@core/schemas/workspace-goals.sql";
import { type AllPlatforms, ContentPublishingStatus } from "@shared/content";
import {
  ContentMetricsSummarySchema,
  InboxSummarySchema,
  type InsightEventPayload,
  InsightsStatusSchema,
  type TimeSeriesPoint,
  TimeSeriesPointSchema,
  type WorkspaceInsightSnapshot,
  type WorkspaceInsightSnapshotRecord,
  WorkspaceInsightSnapshotSchema,
  type WorkspaceSummary,
  WorkspaceSummarySchema,
} from "@shared/insights";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SNAPSHOT_LOOKBACK_DAYS = 7;

function truncateToBucket(date: Date, interval: "day" | "week"): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const truncated = new Date(Date.UTC(year, month, day));

  if (interval === "week") {
    // Align to Monday to match DATE_TRUNC('week') behaviour
    const dayOfWeek = truncated.getUTCDay(); // 0 (Sunday) - 6 (Saturday)
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    return new Date(truncated.getTime() - daysSinceMonday * MS_PER_DAY);
  }

  return truncated;
}

function generateBuckets(
  range: InsightsTimeRange,
  interval: "day" | "week",
): Date[] {
  const start = truncateToBucket(range.start, interval);
  const end = truncateToBucket(range.end, interval);
  const step = interval === "week" ? MS_PER_DAY * 7 : MS_PER_DAY;
  const buckets: Date[] = [];

  for (let ts = start.getTime(); ts <= end.getTime(); ts += step) {
    buckets.push(new Date(ts));
  }

  return buckets;
}

export type InsightsTimeRange = {
  start: Date;
  end: Date;
};

type FunnelMetrics = {
  awareness: number;
  engagement: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
};

type GoalWindow = {
  start: Date;
  endExclusive: Date;
};

type PendingInsightEvent = {
  goalId?: string | null;
  eventType: (typeof insightEventTypeEnum.enumValues)[number];
  severity?: (typeof insightEventSeverityEnum.enumValues)[number];
  payload: InsightEventPayload;
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
      reach: 0,
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
      totals.reach += metrics.reach ?? 0;
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

    const buckets = generateBuckets(range, interval);
    if (buckets.length === 0) {
      return [];
    }

    const bucketExpression =
      interval === "week"
        ? sql`DATE_TRUNC('week', ${contentMetricsSnapshotTable.collectedAt})`
        : sql`DATE_TRUNC('day', ${contentMetricsSnapshotTable.collectedAt})`;

    const contentRows = await db()
      .select({
        bucket: bucketExpression.as("bucket"),
        impressions:
          sql<number>`SUM(COALESCE((metrics->>'impressions')::numeric, 0))`.as(
            "impressions",
          ),
        engagement:
          sql<number>`SUM(COALESCE((metrics->>'engagement')::numeric, 0))`.as(
            "engagement",
          ),
        reach: sql<number>`SUM(COALESCE((metrics->>'reach')::numeric, 0))`.as(
          "reach",
        ),
        clicks: sql<number>`SUM(COALESCE((metrics->>'clicks')::numeric, 0))`.as(
          "clicks",
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

    const contentByBucket = new Map<
      string,
      { impressions: number; engagement: number; reach: number; clicks: number }
    >();

    for (const row of contentRows) {
      const bucketRaw = row.bucket as Date | string;
      const bucketDate =
        bucketRaw instanceof Date ? bucketRaw : new Date(bucketRaw);
      const bucket = truncateToBucket(bucketDate, interval);
      const key = bucket.toISOString();
      contentByBucket.set(key, {
        impressions: Number(row.impressions ?? 0),
        engagement: Number(row.engagement ?? 0),
        reach: Number(row.reach ?? 0),
        clicks: Number(row.clicks ?? 0),
      });
    }

    const followerSnapshots = await db()
      .select({
        collectedAt: connectedAccountMetricsSnapshotTable.collectedAt,
        followersCount: connectedAccountMetricsSnapshotTable.followersCount,
        connectedAccountId:
          connectedAccountMetricsSnapshotTable.connectedAccountId,
      })
      .from(connectedAccountMetricsSnapshotTable)
      .where(
        and(
          eq(connectedAccountMetricsSnapshotTable.workspaceId, workspaceId),
          sql`${connectedAccountMetricsSnapshotTable.collectedAt} >= ${range.start.toISOString()}`,
          sql`${connectedAccountMetricsSnapshotTable.collectedAt} <= ${range.end.toISOString()}`,
        ),
      );

    const followerByBucket = new Map<
      string,
      Map<string, { count: number; collectedAt: number }>
    >();

    for (const row of followerSnapshots) {
      if (row.followersCount === null || row.followersCount === undefined) {
        continue;
      }

      const collectedAt =
        row.collectedAt instanceof Date
          ? row.collectedAt
          : new Date(row.collectedAt);
      const bucket = truncateToBucket(collectedAt, interval);
      const key = bucket.toISOString();
      const accountMap = followerByBucket.get(key) ?? new Map();
      const existing = accountMap.get(row.connectedAccountId);
      const timestamp = collectedAt.getTime();

      if (!existing || timestamp > existing.collectedAt) {
        accountMap.set(row.connectedAccountId, {
          count: row.followersCount ?? 0,
          collectedAt: timestamp,
        });
      }

      followerByBucket.set(key, accountMap);
    }

    const points: TimeSeriesPoint[] = [];
    let lastFollowersTotal: number | null = null;

    for (const bucket of buckets) {
      const key = bucket.toISOString();
      const content = contentByBucket.get(key);
      const accountCounts = followerByBucket.get(key);

      let followersTotal: number;
      if (accountCounts && accountCounts.size > 0) {
        followersTotal = Array.from(accountCounts.values()).reduce(
          (sum, entry) => sum + entry.count,
          0,
        );
        lastFollowersTotal = followersTotal;
      } else {
        followersTotal = lastFollowersTotal ?? 0;
      }

      points.push(
        TimeSeriesPointSchema.parse({
          bucket,
          impressions: content?.impressions ?? 0,
          engagement: content?.engagement ?? 0,
          reach: content?.reach ?? 0,
          clicks: content?.clicks ?? 0,
          followers: followersTotal,
        }),
      );
    }

    return points;
  }

  async generateSnapshotForWorkspace(params: {
    workspaceId: string;
    snapshotDate?: Date;
    lookbackDays?: number;
  }): Promise<WorkspaceInsightSnapshot> {
    const snapshotDate = this.startOfDayUTC(params.snapshotDate ?? new Date());
    const lookbackDays = Math.max(
      params.lookbackDays ?? SNAPSHOT_LOOKBACK_DAYS,
      1,
    );

    const currentRange = this.buildRange(snapshotDate, lookbackDays);
    const previousRangeEnd = this.addDaysUTC(currentRange.start, -1);
    const previousRange = this.buildRange(previousRangeEnd, lookbackDays);

    const [currentFunnel, previousFunnel, topContent] = await Promise.all([
      this.aggregateFunnel(params.workspaceId, currentRange),
      this.aggregateFunnel(params.workspaceId, previousRange),
      this.getTopContent({
        workspaceId: params.workspaceId,
        limit: 3,
        range: {
          start: currentRange.start,
          end: new Date(currentRange.endExclusive.getTime() - 1),
        },
      }),
    ]);

    return createTransaction(async (tx) => {
      const { summaries: goalSummaries, events } =
        await this.updateGoalProgress({
          tx,
          workspaceId: params.workspaceId,
          snapshotDate,
        });

      const payload = WorkspaceInsightSnapshotSchema.parse({
        date: snapshotDate,
        funnel: currentFunnel,
        narrativeHighlights: this.buildNarrativeHighlights(
          currentFunnel,
          previousFunnel,
        ),
        topContent: topContent.map((content) => ({
          contentId: content.id,
          title: this.extractContentTitle(content),
          metric: "impressions",
          change: content.metrics?.impressions ?? 0,
          platform: content.placement,
        })),
        goals: goalSummaries,
        anomalies: [],
      });

      const [snapshot] = await tx
        .insert(workspaceInsightSnapshotsTable)
        .values({
          workspaceId: params.workspaceId,
          snapshotDate,
          payload,
        })
        .onConflictDoUpdate({
          target: [
            workspaceInsightSnapshotsTable.workspaceId,
            workspaceInsightSnapshotsTable.snapshotDate,
          ],
          set: {
            payload,
            updatedAt: new Date(),
          },
        })
        .returning({ id: workspaceInsightSnapshotsTable.id });

      if (events.length > 0) {
        await tx.insert(insightEventsTable).values(
          events.map((event) => ({
            workspaceId: params.workspaceId,
            snapshotId: snapshot.id,
            goalId: event.goalId ?? null,
            eventType: event.eventType,
            severity: event.severity ?? "info",
            payload: event.payload,
          })),
        );
      }

      return payload;
    });
  }

  async getTopContent(params: {
    workspaceId: string;
    limit?: number;
    sortBy?: "impressions" | "engagement";
    range?: InsightsTimeRange;
    platform?: AllPlatforms;
  }): Promise<UnifiedContentSelect[]> {
    const {
      workspaceId,
      limit = 5,
      sortBy = "impressions",
      range,
      platform,
    } = params;

    if (range) {
      const aggregatedRows = await this.getTopContentFromSnapshots({
        workspaceId,
        limit,
        sortBy,
        range,
        platform,
      });

      if (aggregatedRows.length > 0) {
        return aggregatedRows;
      }
    }

    return this.getTopContentFromLifetime({
      workspaceId,
      limit,
      sortBy,
      platform,
    });
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
        lastMessageAt: inboxConversationsTable.lastMessageAt,
        metadata: inboxConversationsTable.metadata,
        platform: inboxConversationsTable.platform,
        channel: inboxConversationsTable.channel,
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
      .groupBy(
        inboxConversationsTable.id,
        inboxConversationsTable.lastMessageAt,
        inboxConversationsTable.metadata,
        inboxConversationsTable.platform,
        inboxConversationsTable.channel,
      );

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

    // Calculate unread conversations using computeUnreadStatus
    const unreadConversations = responseRows.filter((row) => {
      const { isUnread } = computeUnreadStatus({
        lastMessageAt: row.lastMessageAt,
        metadata: row.metadata,
        platform: row.platform,
        channel: row.channel,
      });
      return isUnread;
    });

    const unreadTotal = unreadConversations.length;

    return InboxSummarySchema.parse({
      totalConversations: responseRows.length,
      conversationsWithUserMessages: conversationsWithUserMessages.length,
      conversationsWithResponses: conversationsWithResponses.length,
      totalInboundMessages: inboundTotal,
      openMessages: unreadTotal,
      responseRate,
      averageFirstResponseMinutes,
    });
  }

  async getStatus(params: { workspaceId: string }) {
    const { workspaceId } = params;

    const [{ contentLastRefreshedAt } = { contentLastRefreshedAt: null }] =
      await db()
        .select({
          contentLastRefreshedAt: sql<Date | null>`MAX(${unifiedContentTable.metricsRefreshedAt})`,
        })
        .from(unifiedContentTable)
        .where(eq(unifiedContentTable.workspaceId, workspaceId));

    const [{ followerLastCollectedAt } = { followerLastCollectedAt: null }] =
      await db()
        .select({
          followerLastCollectedAt: sql<Date | null>`MAX(${connectedAccountMetricsSnapshotTable.collectedAt})`,
        })
        .from(connectedAccountMetricsSnapshotTable)
        .where(
          eq(connectedAccountMetricsSnapshotTable.workspaceId, workspaceId),
        );

    const [{ inboxLastUpdatedAt } = { inboxLastUpdatedAt: null }] = await db()
      .select({
        inboxLastUpdatedAt: sql<Date | null>`MAX(${inboxMessagesTable.createdAt})`,
      })
      .from(inboxMessagesTable)
      .innerJoin(
        inboxConversationsTable,
        eq(inboxMessagesTable.inboxConversationId, inboxConversationsTable.id),
      )
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .where(eq(connectedAccount.workspaceId, workspaceId));

    return InsightsStatusSchema.parse({
      contentLastRefreshedAt,
      followerLastCollectedAt,
      inboxLastUpdatedAt,
    });
  }

  async getLatestSnapshot(params: {
    workspaceId: string;
  }): Promise<WorkspaceInsightSnapshotRecord | null> {
    const [row] = await db()
      .select({
        snapshotDate: workspaceInsightSnapshotsTable.snapshotDate,
        payload: workspaceInsightSnapshotsTable.payload,
      })
      .from(workspaceInsightSnapshotsTable)
      .where(eq(workspaceInsightSnapshotsTable.workspaceId, params.workspaceId))
      .orderBy(desc(workspaceInsightSnapshotsTable.snapshotDate))
      .limit(1);

    if (!row) {
      return null;
    }

    const snapshotDate =
      row.snapshotDate instanceof Date
        ? row.snapshotDate
        : new Date(row.snapshotDate);

    return {
      snapshotDate,
      snapshot: WorkspaceInsightSnapshotSchema.parse(row.payload ?? {}),
    };
  }

  private async aggregateFunnel(
    workspaceId: string,
    range: GoalWindow,
  ): Promise<FunnelMetrics> {
    const [{ engagement = 0, reach = 0, clicks = 0, conversions = 0 } = {}] =
      await db()
        .select({
          engagement: sql<number>`COALESCE(SUM((metrics->>'engagement')::numeric), 0)`,
          reach: sql<number>`COALESCE(SUM((metrics->>'reach')::numeric), 0)`,
          clicks: sql<number>`COALESCE(SUM((metrics->>'clicks')::numeric), 0)`,
          conversions: sql<number>`COALESCE(SUM((metrics->>'linkClicks')::numeric), 0)`,
        })
        .from(contentMetricsSnapshotTable)
        .where(
          and(
            eq(contentMetricsSnapshotTable.workspaceId, workspaceId),
            sql`${contentMetricsSnapshotTable.collectedAt} >= ${range.start.toISOString()}`,
            sql`${contentMetricsSnapshotTable.collectedAt} < ${range.endExclusive.toISOString()}`,
          ),
        );

    const conversionRate =
      conversions > 0 && reach > 0 ? conversions / reach : 0;

    return {
      awareness: Number(reach),
      engagement: Number(engagement),
      clicks: Number(clicks),
      conversions: Number(conversions),
      conversionRate,
    };
  }

  private buildNarrativeHighlights(
    current: FunnelMetrics,
    previous: FunnelMetrics,
  ) {
    const highlights: NonNullable<
      WorkspaceInsightSnapshot["narrativeHighlights"]
    > = [];

    const awarenessDelta = this.computeDeltaPercentage(
      previous.awareness,
      current.awareness,
    );

    if (awarenessDelta !== null) {
      highlights.push({
        headline:
          awarenessDelta >= 0 ? "Reach is growing" : "Reach dipped this period",
        body:
          awarenessDelta >= 0
            ? `You reached ${this.formatNumber(current.awareness)} people, up ${Math.abs(
                Math.round(awarenessDelta * 100),
              )}% vs last period.`
            : `Reach fell ${Math.abs(
                Math.round(awarenessDelta * 100),
              )}% to ${this.formatNumber(current.awareness)}.`,
        metric: "awareness",
        delta: awarenessDelta,
      });
    }

    if (highlights.length === 0) {
      highlights.push({
        headline: "Fresh insights are ready",
        body: `Captured ${this.formatNumber(
          current.engagement,
        )} engagements over the last ${SNAPSHOT_LOOKBACK_DAYS} days.`,
        metric: "engagement",
      });
    }

    return highlights;
  }

  private async updateGoalProgress(params: {
    tx: Transaction;
    workspaceId: string;
    snapshotDate: Date;
  }) {
    const goals = await params.tx
      .select()
      .from(workspaceGoalsTable)
      .where(
        and(
          eq(workspaceGoalsTable.workspaceId, params.workspaceId),
          eq(workspaceGoalsTable.status, "active"),
        ),
      );

    const summaries: NonNullable<WorkspaceInsightSnapshot["goals"]> = [];
    const events: PendingInsightEvent[] = [];

    for (const goal of goals) {
      const window = this.getGoalWindow(params.snapshotDate, goal.cadence);
      const actualValue = await this.computeGoalActualValue(
        params.tx,
        goal,
        window,
      );

      const [existingProgress] = await params.tx
        .select({
          actualValue: workspaceGoalProgressTable.actualValue,
          targetValue: workspaceGoalProgressTable.targetValue,
        })
        .from(workspaceGoalProgressTable)
        .where(
          and(
            eq(workspaceGoalProgressTable.goalId, goal.id),
            eq(workspaceGoalProgressTable.windowStart, window.start),
            eq(workspaceGoalProgressTable.windowEnd, window.endExclusive),
          ),
        )
        .limit(1);

      const wasAchieved =
        existingProgress !== undefined &&
        existingProgress.actualValue >= existingProgress.targetValue;

      const [previousWindow] = await params.tx
        .select({
          streakCount: workspaceGoalProgressTable.streakCount,
          actualValue: workspaceGoalProgressTable.actualValue,
          targetValue: workspaceGoalProgressTable.targetValue,
          windowEnd: workspaceGoalProgressTable.windowEnd,
        })
        .from(workspaceGoalProgressTable)
        .where(
          and(
            eq(workspaceGoalProgressTable.goalId, goal.id),
            sql`${workspaceGoalProgressTable.windowEnd} < ${window.start.toISOString()}`,
          ),
        )
        .orderBy(desc(workspaceGoalProgressTable.windowEnd))
        .limit(1);

      const achieved = goal.targetValue > 0 && actualValue >= goal.targetValue;
      const priorStreakEligible =
        previousWindow &&
        previousWindow.actualValue >= previousWindow.targetValue
          ? previousWindow.streakCount
          : 0;
      const streakCount = achieved ? priorStreakEligible + 1 : 0;

      await params.tx
        .insert(workspaceGoalProgressTable)
        .values({
          workspaceId: params.workspaceId,
          goalId: goal.id,
          windowStart: window.start,
          windowEnd: window.endExclusive,
          actualValue,
          targetValue: goal.targetValue,
          streakCount,
        })
        .onConflictDoUpdate({
          target: [
            workspaceGoalProgressTable.goalId,
            workspaceGoalProgressTable.windowStart,
            workspaceGoalProgressTable.windowEnd,
          ],
          set: {
            actualValue,
            targetValue: goal.targetValue,
            streakCount,
            updatedAt: new Date(),
          },
        });

      const progressPercent =
        goal.targetValue > 0 ? actualValue / goal.targetValue : 0;

      summaries.push({
        goalId: goal.id,
        status: goal.status,
        progressPercent: Math.min(Math.max(progressPercent, 0), 1),
        streak: streakCount,
      });

      if (achieved && !wasAchieved) {
        events.push({
          goalId: goal.id,
          eventType: "goal_achieved",
          severity: "info",
          payload: {
            message: this.buildGoalAchievementMessage(goal),
            metric: goal.goalType,
            delta: actualValue,
          },
        });
      }
    }

    return { summaries, events };
  }

  private async computeGoalActualValue(
    tx: Transaction,
    goal: WorkspaceGoalSelect,
    window: GoalWindow,
  ): Promise<number> {
    if (goal.goalType === "publish_cadence") {
      const [{ count = 0 } = {}] = await tx
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.workspaceId, goal.workspaceId),
            eq(
              unifiedContentTable.publishingStatus,
              ContentPublishingStatus.PUBLISHED,
            ),
            sql`${unifiedContentTable.createdAt} >= ${window.start.toISOString()}`,
            sql`${unifiedContentTable.createdAt} < ${window.endExclusive.toISOString()}`,
          ),
        );

      return Number(count ?? 0);
    }

    const [{ reach = 0 } = {}] = await tx
      .select({
        reach: sql<number>`COALESCE(SUM((metrics->>'reach')::numeric), 0)`,
      })
      .from(contentMetricsSnapshotTable)
      .where(
        and(
          eq(contentMetricsSnapshotTable.workspaceId, goal.workspaceId),
          sql`${contentMetricsSnapshotTable.collectedAt} >= ${window.start.toISOString()}`,
          sql`${contentMetricsSnapshotTable.collectedAt} < ${window.endExclusive.toISOString()}`,
        ),
      );

    return Number(reach ?? 0);
  }

  private buildGoalAchievementMessage(goal: WorkspaceGoalSelect) {
    if (goal.goalType === "publish_cadence") {
      return `You met your ${goal.cadence} publishing goal of ${goal.targetValue} posts.`;
    }
    return `You reached your ${goal.cadence} reach goal of ${this.formatNumber(goal.targetValue)} impressions.`;
  }

  private getGoalWindow(
    date: Date,
    cadence: WorkspaceGoalSelect["cadence"],
  ): GoalWindow {
    if (cadence === "weekly") {
      const start = truncateToBucket(date, "week");
      return { start, endExclusive: this.addDaysUTC(start, 7) };
    }

    const monthStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    );
    const nextMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
    return {
      start: monthStart,
      endExclusive: nextMonth,
    };
  }

  private buildRange(date: Date, days: number): GoalWindow {
    const start = this.addDaysUTC(date, -(days - 1));
    return {
      start,
      endExclusive: this.addDaysUTC(date, 1),
    };
  }

  private startOfDayUTC(date: Date) {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  private addDaysUTC(date: Date, days: number) {
    return new Date(date.getTime() + days * MS_PER_DAY);
  }

  private computeDeltaPercentage(previous: number, current: number) {
    if (!previous) {
      return current > 0 ? 1 : null;
    }
    return (current - previous) / previous;
  }

  private formatNumber(value: number) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}k`;
    }
    return value.toString();
  }

  private extractContentTitle(content: UnifiedContentSelect) {
    const spec = content.placementSpec as { message?: string } | null;
    if (spec?.message) {
      return spec.message.length > 100
        ? `${spec.message.slice(0, 97)}...`
        : spec.message;
    }

    return content.sourceContentId ?? undefined;
  }

  private async getTopContentFromSnapshots(params: {
    workspaceId: string;
    limit: number;
    sortBy: "impressions" | "engagement";
    range: InsightsTimeRange;
    platform?: AllPlatforms;
  }): Promise<UnifiedContentSelect[]> {
    const { workspaceId, limit, sortBy, range, platform } = params;

    let whereClause = and(
      eq(unifiedContentTable.workspaceId, workspaceId),
      sql`${contentMetricsSnapshotTable.collectedAt} >= ${range.start.toISOString()}`,
      sql`${contentMetricsSnapshotTable.collectedAt} <= ${range.end.toISOString()}`,
    );

    if (platform) {
      whereClause = and(whereClause, eq(connectedAccount.platform, platform));
    }

    const aggregated = await db()
      .select({
        contentId: contentMetricsSnapshotTable.contentId,
        impressions:
          sql<number>`SUM(COALESCE((content_metrics_snapshot.metrics->>'impressions')::numeric, 0))`.as(
            "impressions",
          ),
        engagement:
          sql<number>`SUM(COALESCE((content_metrics_snapshot.metrics->>'engagement')::numeric, 0))`.as(
            "engagement",
          ),
        reach:
          sql<number>`SUM(COALESCE((content_metrics_snapshot.metrics->>'reach')::numeric, 0))`.as(
            "reach",
          ),
        clicks:
          sql<number>`SUM(COALESCE((content_metrics_snapshot.metrics->>'clicks')::numeric, 0))`.as(
            "clicks",
          ),
      })
      .from(contentMetricsSnapshotTable)
      .innerJoin(
        unifiedContentTable,
        eq(contentMetricsSnapshotTable.contentId, unifiedContentTable.id),
      )
      .leftJoin(
        connectedAccount,
        eq(unifiedContentTable.connectedAccountId, connectedAccount.id),
      )
      .where(whereClause)
      .groupBy(contentMetricsSnapshotTable.contentId)
      .orderBy(
        desc(
          sortBy === "engagement"
            ? sql`SUM(COALESCE((content_metrics_snapshot.metrics->>'engagement')::numeric, 0))`
            : sql`SUM(COALESCE((content_metrics_snapshot.metrics->>'impressions')::numeric, 0))`,
        ),
      )
      .limit(limit);

    if (aggregated.length === 0) {
      return [];
    }

    const ids = aggregated.map((row) => row.contentId);
    const idList = ids as [string, ...string[]];

    const contentRows = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          inArray(unifiedContentTable.id, idList),
        ),
      );

    const contentById = new Map(contentRows.map((row) => [row.id, row]));

    const results: UnifiedContentSelect[] = [];

    for (const aggregatedRow of aggregated) {
      const base = contentById.get(aggregatedRow.contentId);
      if (!base) continue;

      const parsed = UnifiedContentSelectSchema.parse(base);
      const currentMetrics = parsed.metrics ?? {};

      parsed.metrics = {
        ...currentMetrics,
        impressions: Number(aggregatedRow.impressions ?? 0),
        engagement: Number(aggregatedRow.engagement ?? 0),
        reach: Number(aggregatedRow.reach ?? 0),
        clicks: Number(aggregatedRow.clicks ?? 0),
      };

      results.push(parsed);
    }

    return results.slice(0, limit);
  }

  private async getTopContentFromLifetime(params: {
    workspaceId: string;
    limit: number;
    sortBy: "impressions" | "engagement";
    platform?: AllPlatforms;
  }): Promise<UnifiedContentSelect[]> {
    const { workspaceId, limit, sortBy, platform } = params;

    const lifetimeMetricExpression =
      sortBy === "engagement"
        ? sql`COALESCE((unified_content.metrics->>'engagement')::numeric, 0)`
        : sql`COALESCE((unified_content.metrics->>'impressions')::numeric, 0)`;

    const rows = await db()
      .select({ content: unifiedContentTable })
      .from(unifiedContentTable)
      .leftJoin(
        connectedAccount,
        eq(unifiedContentTable.connectedAccountId, connectedAccount.id),
      )
      .where(
        platform
          ? and(
              eq(unifiedContentTable.workspaceId, workspaceId),
              eq(connectedAccount.platform, platform),
            )
          : eq(unifiedContentTable.workspaceId, workspaceId),
      )
      .orderBy(desc(lifetimeMetricExpression))
      .limit(limit);

    return rows
      .map((row) => row.content)
      .filter(Boolean)
      .map((row) => UnifiedContentSelectSchema.parse(row));
  }
}
