import { z } from "zod";

export const ContentMetricsSummarySchema = z.object({
  impressions: z.number().optional(),
  engagement: z.number().optional(),
  reach: z.number().optional(),
  clicks: z.number().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
});

export type ContentMetricsSummary = z.infer<typeof ContentMetricsSummarySchema>;

const WorkspaceSummarySchema = z.object({
  totals: ContentMetricsSummarySchema,
  lastRefreshedAt: z.coerce.date().nullable(),
});

export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;

export const TimeSeriesPointSchema = z.object({
  bucket: z.coerce.date(),
  impressions: z.number(),
  engagement: z.number(),
  reach: z.number(),
  clicks: z.number(),
  followers: z.number(),
});

export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const InboxSummarySchema = z.object({
  totalConversations: z.number(),
  conversationsWithUserMessages: z.number(),
  conversationsWithResponses: z.number(),
  totalInboundMessages: z.number(),
  openMessages: z.number(),
  responseRate: z.number(),
  averageFirstResponseMinutes: z.number().nullable(),
});

export type InboxSummary = z.infer<typeof InboxSummarySchema>;

export const InsightsStatusSchema = z.object({
  contentLastRefreshedAt: z.coerce.date().nullable(),
  followerLastCollectedAt: z.coerce.date().nullable(),
  inboxLastUpdatedAt: z.coerce.date().nullable(),
});

export type InsightsStatus = z.infer<typeof InsightsStatusSchema>;

export type WorkspaceInsightsSummaryResponse = WorkspaceSummary;
export type WorkspaceInsightsTimeSeriesResponse = TimeSeriesPoint[];
export { WorkspaceSummarySchema };

export const InsightNarrativeHighlightSchema = z.object({
  headline: z.string(),
  body: z.string().optional(),
  metric: z.string().optional(),
  delta: z.number().optional(),
  platform: z.string().optional(),
});

export type InsightNarrativeHighlight = z.infer<
  typeof InsightNarrativeHighlightSchema
>;

export const InsightFunnelSchema = z.object({
  awareness: z.number().optional(),
  engagement: z.number().optional(),
  clicks: z.number().optional(),
  conversions: z.number().optional(),
  conversionRate: z.number().optional(),
});

export type InsightFunnel = z.infer<typeof InsightFunnelSchema>;

export const InsightGoalSummarySchema = z.object({
  goalId: z.string(),
  status: z.string(),
  progressPercent: z.number().optional(),
  streak: z.number().optional(),
  goalType: z.string().optional(),
  cadence: z.string().optional(),
  targetValue: z.number().optional(),
  actualValue: z.number().optional(),
});

export type InsightGoalSummary = z.infer<typeof InsightGoalSummarySchema>;

export const InsightAnomalySchema = z.object({
  metric: z.string(),
  severity: z.string().optional(),
  detectedAt: z.coerce.date().optional(),
  insight: z.string().optional(),
});

export type InsightAnomaly = z.infer<typeof InsightAnomalySchema>;

export const InsightTopContentSchema = z.object({
  contentId: z.string(),
  title: z.string().optional(),
  metric: z.string().optional(),
  change: z.number().optional(),
  platform: z.string().optional(),
});

export type InsightTopContent = z.infer<typeof InsightTopContentSchema>;

export const CadenceSummarySchema = z.object({
  completedPosts: z.number(),
  targetPosts: z.number(),
  progressPercent: z.number(),
});

export type CadenceSummary = z.infer<typeof CadenceSummarySchema>;

export const ReachMomentumSchema = z.object({
  reach: z.number(),
  deltaPercent: z.number().nullable(),
});

export type ReachMomentum = z.infer<typeof ReachMomentumSchema>;

export const AiMediaImpactSchema = z.object({
  generatedPosts: z.number(),
  engagementLiftPercent: z.number(),
  hoursSaved: z.number(),
});

export type AiMediaImpact = z.infer<typeof AiMediaImpactSchema>;

export const WorkspaceInsightSnapshotSchema = z.object({
  date: z.coerce.date(),
  funnel: InsightFunnelSchema.optional(),
  narrativeHighlights: z.array(InsightNarrativeHighlightSchema).optional(),
  topContent: z.array(InsightTopContentSchema).optional(),
  goals: z.array(InsightGoalSummarySchema).optional(),
  anomalies: z.array(InsightAnomalySchema).optional(),
  cadenceSummary: CadenceSummarySchema.optional(),
  reachMomentum: ReachMomentumSchema.optional(),
  aiMediaImpact: AiMediaImpactSchema.optional(),
});

export type WorkspaceInsightSnapshot = z.infer<
  typeof WorkspaceInsightSnapshotSchema
>;

export const InsightEventPayloadSchema = z.object({
  message: z.string(),
  metric: z.string().optional(),
  delta: z.number().optional(),
  relatedContentId: z.string().optional(),
});

export type InsightEventPayload = z.infer<typeof InsightEventPayloadSchema>;

export const WorkspaceInsightSnapshotRecordSchema = z.object({
  snapshotDate: z.coerce.date(),
  snapshot: WorkspaceInsightSnapshotSchema,
});

export type WorkspaceInsightSnapshotRecord = z.infer<
  typeof WorkspaceInsightSnapshotRecordSchema
>;
