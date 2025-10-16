import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import type { AllPlacement } from "@shared/content";

const log = Log.create({ namespace: "content-metrics" });

export type ContentMetricsTarget = {
  id: string;
  placement: AllPlacement;
  sourceContentId: string | null;
  connectedAccountId: string | null;
};

export type ContentMetricsFetchResult = {
  contentId: string;
  metrics: UnifiedContentMetrics;
};

export type ContentMetricsRefreshResult = {
  processed: number;
  updated: number;
  failures: Array<{
    contentId: string;
    reason: string;
  }>;
};

/**
 * Placeholder implementation for content metrics refresh.
 * Platform-specific integrations will plug into this class.
 */
export class ContentMetricsRefresher {
  async refresh(
    workspaceId: string,
    targets: ContentMetricsTarget[],
  ): Promise<ContentMetricsRefreshResult> {
    if (targets.length === 0) {
      return { processed: 0, updated: 0, failures: [] };
    }

    log.info("content metrics refresh (stub)", {
      workspaceId,
      targetCount: targets.length,
    });

    // TODO: fetch metrics per platform and persist to unified_content.
    return {
      processed: targets.length,
      updated: 0,
      failures: [],
    };
  }
}
