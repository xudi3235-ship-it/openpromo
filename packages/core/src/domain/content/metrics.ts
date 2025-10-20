import {
  type ContentMetricsAnalyticsPoint,
  writeContentMetricsAnalytics,
} from "@core/domain/insights/analytics-engine";
import { and, db, eq } from "@core/helpers/db";
import {
  ContentMetricsGranularity,
  contentMetricsSnapshotTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import {
  type ContentMetricsProvider,
  FacebookContentMetricsProvider,
  InstagramContentMetricsProvider,
  type ProviderFetchResult,
  TikTokContentMetricsProvider,
} from "./metrics/providers";
import type {
  ContentMetricsFetchResult,
  ContentMetricsRefreshResult,
  ContentMetricsTarget,
} from "./metrics/types";

const log = Log.create({ namespace: "content-metrics" });

/**
 * Placeholder implementation for content metrics refresh.
 * Platform-specific integrations will plug into this class.
 */
export class ContentMetricsRefresher {
  private readonly providers: ContentMetricsProvider[];

  constructor(providers?: ContentMetricsProvider[]) {
    this.providers = providers ?? [
      new FacebookContentMetricsProvider(),
      new InstagramContentMetricsProvider(),
      new TikTokContentMetricsProvider(),
    ];
  }

  async refresh(
    workspaceId: string,
    targets: ContentMetricsTarget[],
  ): Promise<ContentMetricsRefreshResult> {
    if (targets.length === 0) {
      return { processed: 0, updated: 0, failures: [] };
    }

    const successes: ContentMetricsFetchResult[] = [];
    const failures: ContentMetricsRefreshResult["failures"] = [];

    const assignments = new Map<
      ContentMetricsProvider,
      ContentMetricsTarget[]
    >();
    const unsupported: ContentMetricsTarget[] = [];

    for (const target of targets) {
      const provider = this.providers.find((candidate) =>
        candidate.supports(target),
      );
      if (!provider) {
        unsupported.push(target);
        continue;
      }
      const list = assignments.get(provider) ?? [];
      list.push(target);
      assignments.set(provider, list);
    }

    for (const target of unsupported) {
      log.info("no metrics provider registered for placement", {
        contentId: target.id,
        placement: target.placement,
      });
      failures.push({
        contentId: target.id,
        reason: "unsupported or no metrics provider",
      });
    }

    for (const [provider, providerTargets] of assignments.entries()) {
      const result = await this.runProvider(provider, providerTargets);
      // biome-ignore lint/suspicious/useIterableCallbackReturn: lib
      result.successes.forEach((item) =>
        successes.push({
          contentId: item.contentId,
          metrics: item.metrics,
          normalizedSourceContentId: item.normalizedSourceContentId,
        }),
      );
      failures.push(...result.failures);
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

  private async runProvider(
    provider: ContentMetricsProvider,
    targets: ContentMetricsTarget[],
  ): Promise<ProviderFetchResult> {
    try {
      return await provider.fetchBatch(targets);
    } catch (error) {
      log.warn("content metrics provider failed", {
        provider: provider.constructor.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        successes: [],
        failures: targets.map((target) => ({
          contentId: target.id,
          reason:
            error instanceof Error && error.message
              ? error.message
              : "provider failed",
        })),
      };
    }
  }

  private async persistMetrics(
    workspaceId: string,
    results: ContentMetricsFetchResult[],
  ): Promise<string[]> {
    const collectedAt = new Date();
    const missing: string[] = [];
    const analyticsPoints: ContentMetricsAnalyticsPoint[] = [];

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
          .returning({
            id: unifiedContentTable.id,
            placement: unifiedContentTable.placement,
            sourceContentId: unifiedContentTable.sourceContentId,
          });

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

        analyticsPoints.push({
          workspaceId,
          contentId: updated.id,
          placement: updated.placement,
          sourceContentId: updated.sourceContentId,
          collectedAt,
          metrics: result.metrics,
        });
      }
    });

    if (analyticsPoints.length > 0) {
      writeContentMetricsAnalytics(analyticsPoints);
    }

    return missing;
  }
}

export type {
  ContentMetricsFetchResult,
  ContentMetricsRefreshResult,
  ContentMetricsTarget,
} from "./metrics/types";
