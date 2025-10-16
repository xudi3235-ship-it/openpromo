import { EntFacebookPublishedContent } from "@core/domain/content/entity";
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

    const successes: ContentMetricsFetchResult[] = [];
    const failures: ContentMetricsRefreshResult["failures"] = [];

    for (const target of targets) {
      try {
        const metrics = await this.fetchMetricsForTarget(target);
        if (!metrics) {
          failures.push({
            contentId: target.id,
            reason: "unsupported or no metrics returned",
          });
          continue;
        }
        successes.push({ contentId: target.id, metrics });
      } catch (error) {
        failures.push({
          contentId: target.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    log.info("content metrics refresh processed batch", {
      workspaceId,
      processed: targets.length,
      successes: successes.length,
      failures: failures.length,
    });

    return {
      processed: targets.length,
      updated: successes.length,
      failures,
    };
  }

  private async fetchMetricsForTarget(
    target: ContentMetricsTarget,
  ): Promise<UnifiedContentMetrics | null> {
    if (EntFacebookPublishedContent.supports(target)) {
      const entity = EntFacebookPublishedContent.fromTarget(target);
      return entity.fetchMetrics();
    }

    console.debug("no metrics provider registered for placement", {
      contentId: target.id,
      placement: target.placement,
    });

    return null;
  }
}
