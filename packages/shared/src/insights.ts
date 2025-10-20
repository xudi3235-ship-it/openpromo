import { z } from "zod";

export const ContentMetricsSummarySchema = z.object({
  impressions: z.number().optional(),
  engagement: z.number().optional(),
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
});

export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const TopContentEntrySchema = z.object({
  contentId: z.string(),
  sourceContentId: z.string().optional(),
  placement: z.string(),
  metrics: ContentMetricsSummarySchema,
  lastRefreshedAt: z.coerce.date().optional(),
});

export type TopContentEntry = z.infer<typeof TopContentEntrySchema>;

export type WorkspaceInsightsSummaryResponse = WorkspaceSummary;
export type WorkspaceInsightsTimeSeriesResponse = TimeSeriesPoint[];
export type WorkspaceInsightsTopContentResponse = TopContentEntry[];
export { WorkspaceSummarySchema };
