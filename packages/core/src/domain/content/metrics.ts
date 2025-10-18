import {
  EntFacebookPublishedContent,
  EntInstagramPublishedContent,
} from "@core/domain/content/entity";
import { and, db, eq } from "@core/helpers/db";
import {
  ContentMetricsGranularity,
  contentMetricsSnapshotTable,
  type UnifiedContentMetrics,
  unifiedContentTable,
} from "@core/schemas/content.sql";
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
        const fetchResult = await this.fetchMetricsForTarget(target);
        if (!fetchResult) {
          failures.push({
            contentId: target.id,
            reason: "unsupported or no metrics returned",
          });
          continue;
        }
        successes.push({
          contentId: target.id,
          metrics: fetchResult.metrics,
          normalizedSourceContentId: fetchResult.normalizedSourceContentId,
        });
      } catch (error) {
        failures.push({
          contentId: target.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    let missing: string[] = [];
    if (successes.length > 0) {
      missing = await this.persistMetrics(workspaceId, successes);
      for (const contentId of missing) {
        failures.push({
          contentId,
          reason: "content record missing during metrics persistence",
        });
      }
    }

    return {
      processed: targets.length,
      updated: successes.length - missing.length,
      failures,
    };
  }

  private async fetchMetricsForTarget(target: ContentMetricsTarget): Promise<{
    metrics: UnifiedContentMetrics;
    normalizedSourceContentId?: string;
  } | null> {
    const originalSourceContentId = target.sourceContentId;

    if (EntFacebookPublishedContent.supports(target)) {
      const entity = EntFacebookPublishedContent.fromTarget(target);
      const metrics = await entity.fetchMetrics();
      if (!metrics) return null;
      return {
        metrics,
        normalizedSourceContentId:
          entity.target.sourceContentId !== originalSourceContentId
            ? (entity.target.sourceContentId ?? undefined)
            : undefined,
      };
    }
    if (EntInstagramPublishedContent.supports(target)) {
      const entity = EntInstagramPublishedContent.fromTarget(target);
      const metrics = await entity.fetchMetrics();
      if (!metrics) return null;
      return {
        metrics,
        normalizedSourceContentId:
          entity.target.sourceContentId !== originalSourceContentId
            ? (entity.target.sourceContentId ?? undefined)
            : undefined,
      };
    }

    console.debug("no metrics provider registered for placement", {
      contentId: target.id,
      placement: target.placement,
    });

    return null;
  }

  private async persistMetrics(
    workspaceId: string,
    results: ContentMetricsFetchResult[],
  ): Promise<string[]> {
    const collectedAt = new Date();
    const missing: string[] = [];

    await db().transaction(async (tx) => {
      for (const result of results) {
        const updateValues: Record<string, unknown> = {
          metrics: result.metrics,
          metricsRefreshedAt: collectedAt,
        };

        if (result.normalizedSourceContentId) {
          updateValues.sourceContentId = result.normalizedSourceContentId;
        }

        const [updated] = await tx
          .update(unifiedContentTable)
          .set(updateValues)
          .where(
            and(
              eq(unifiedContentTable.workspaceId, workspaceId),
              eq(unifiedContentTable.id, result.contentId),
            ),
          )
          .returning({ id: unifiedContentTable.id });

        if (!updated) {
          log.warn("content metrics persistence skipped missing record", {
            workspaceId,
            contentId: result.contentId,
          });
          missing.push(result.contentId);
          continue;
        }

        await tx.insert(contentMetricsSnapshotTable).values({
          workspaceId,
          contentId: result.contentId,
          metrics: result.metrics,
          collectedAt,
          granularity: ContentMetricsGranularity.DAILY,
        });
      }
    });

    return missing;
  }
}
