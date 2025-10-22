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
