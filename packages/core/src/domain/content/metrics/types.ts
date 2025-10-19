import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import type { AllPlacement } from "@shared/content";

export type ContentMetricsTarget = {
  id: string;
  placement: AllPlacement;
  sourceContentId: string | null;
  connectedAccountId: string | null;
};

export type ContentMetricsFetchResult = {
  contentId: string;
  metrics: UnifiedContentMetrics;
  normalizedSourceContentId?: string;
};

export type ContentMetricsRefreshResult = {
  processed: number;
  updated: number;
  failures: Array<{
    contentId: string;
    reason: string;
  }>;
};
