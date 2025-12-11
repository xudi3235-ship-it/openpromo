import { and, db, eq } from "@core/database/db";
import {
  type ContentMetricsAnalyticsPoint,
  writeContentMetricsAnalytics,
} from "@core/domain/insights/analytics-engine";
import {
  ContentMetricsGranularity,
  contentMetricsSnapshotTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
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
    const startTime = Date.now();

    if (targets.length === 0) {
      console.info("content metrics refresh skipped - no targets", {
        workspaceId,
      });
      return { processed: 0, updated: 0, failures: [] };
    }

    console.info("content metrics refresh started", {
      workspaceId,
      targetCount: targets.length,
      placements: [...new Set(targets.map((t) => t.placement))],
    });

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
      console.info("no metrics provider registered for placement", {
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

    const duration = Date.now() - startTime;
    const result = {
      processed: targets.length,
      updated: successes.length - missing.length,
      failures,
    };

    console.info("content metrics refresh completed", {
      workspaceId,
      duration: `${duration}ms`,
      processed: result.processed,
      updated: result.updated,
      failed: result.failures.length,
      unsupported: unsupported.length,
    });

    // Log failure reasons for debugging
    if (result.failures.length > 0) {
      const failureReasons = result.failures.reduce(
        (acc, failure) => {
          acc[failure.reason] = (acc[failure.reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      console.warn("content metrics refresh failures summary", {
        workspaceId,
        failureReasons,
      });
    }

    return result;
  }

  private async runProvider(
    provider: ContentMetricsProvider,
    targets: ContentMetricsTarget[],
  ): Promise<ProviderFetchResult> {
    const startTime = Date.now();
    const providerName = provider.constructor.name;

    try {
      console.info("running content metrics provider", {
        provider: providerName,
        targetCount: targets.length,
        targets: targets.map((t) => ({ id: t.id, placement: t.placement })),
      });

      const result = await provider.fetchBatch(targets);
      const duration = Date.now() - startTime;

      console.info("content metrics provider completed", {
        provider: providerName,
        duration: `${duration}ms`,
        successCount: result.successes.length,
        failureCount: result.failures.length,
      });

      // Log individual failures for debugging
      if (result.failures.length > 0) {
        console.warn("content metrics provider had failures", {
          provider: providerName,
          failures: result.failures.slice(0, 5), // Log first 5 failures
          totalFailures: result.failures.length,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error("content metrics provider crashed", {
        provider: providerName,
        duration: `${duration}ms`,
        error: errorMessage,
        stack: errorStack,
        targetCount: targets.length,
      });

      // Return all targets as failed with detailed error
      return {
        successes: [],
        failures: targets.map((target) => ({
          contentId: target.id,
          reason: `${providerName} failed: ${errorMessage}`,
        })),
      };
    }
  }

  private async persistMetrics(
    workspaceId: string,
    results: ContentMetricsFetchResult[],
  ): Promise<string[]> {
    const startTime = Date.now();
    const collectedAt = new Date();
    const missing: string[] = [];
    const analyticsPoints: ContentMetricsAnalyticsPoint[] = [];

    console.info("persisting content metrics", {
      workspaceId,
      resultCount: results.length,
    });

    try {
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
            console.warn("content metrics persistence skipped missing record", {
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
        await writeContentMetricsAnalytics(analyticsPoints);
      }

      const duration = Date.now() - startTime;
      console.info("content metrics persisted", {
        workspaceId,
        duration: `${duration}ms`,
        persisted: results.length - missing.length,
        missing: missing.length,
        analyticsPoints: analyticsPoints.length,
      });

      return missing;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("content metrics persistence failed", {
        workspaceId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        resultCount: results.length,
      });
      return results.map((r) => r.contentId);
    }
  }
}

export type {
  ContentMetricsFetchResult,
  ContentMetricsRefreshResult,
  ContentMetricsTarget,
} from "./metrics/types";
