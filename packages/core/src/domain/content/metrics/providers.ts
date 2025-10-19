import {
  EntFacebookPublishedContent,
  EntInstagramPublishedContent,
} from "@core/domain/content/entity";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import type { ContentMetricsTarget } from "./types";

export type ProviderFetchSuccess = {
  contentId: string;
  metrics: UnifiedContentMetrics;
  normalizedSourceContentId?: string;
};

export type ProviderFetchFailure = {
  contentId: string;
  reason: string;
};

export type ProviderFetchResult = {
  successes: ProviderFetchSuccess[];
  failures: ProviderFetchFailure[];
};

export interface ContentMetricsProvider {
  supports(target: ContentMetricsTarget): boolean;
  fetchBatch(targets: ContentMetricsTarget[]): Promise<ProviderFetchResult>;
}

abstract class BaseEntityProvider implements ContentMetricsProvider {
  protected readonly log: ReturnType<typeof Log.create>;

  constructor(namespace: string) {
    this.log = Log.create({ namespace });
  }

  supports(_target: ContentMetricsTarget): boolean {
    return false;
  }

  async fetchBatch(
    targets: ContentMetricsTarget[],
  ): Promise<ProviderFetchResult> {
    if (targets.length === 0) {
      return { successes: [], failures: [] };
    }

    const successes: ProviderFetchSuccess[] = [];
    const failures: ProviderFetchFailure[] = [];

    for (const target of targets) {
      try {
        const result = await this.fetchOne(target);
        if (!result) {
          failures.push({
            contentId: target.id,
            reason: "unsupported or no metrics returned",
          });
          continue;
        }
        successes.push(result);
      } catch (error) {
        failures.push({
          contentId: target.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { successes, failures };
  }

  protected abstract fetchOne(
    target: ContentMetricsTarget,
  ): Promise<ProviderFetchSuccess | null>;
}

export class FacebookContentMetricsProvider extends BaseEntityProvider {
  constructor() {
    super("content-metrics.provider.facebook");
  }

  override supports(target: ContentMetricsTarget): boolean {
    return EntFacebookPublishedContent.supports(target);
  }

  protected override async fetchOne(
    target: ContentMetricsTarget,
  ): Promise<ProviderFetchSuccess | null> {
    const originalSourceId = target.sourceContentId;
    const entity = EntFacebookPublishedContent.fromTarget(target);
    const metrics = await entity.fetchMetrics();
    if (!metrics) return null;

    return {
      contentId: target.id,
      metrics,
      normalizedSourceContentId:
        entity.target.sourceContentId !== originalSourceId
          ? (entity.target.sourceContentId ?? undefined)
          : undefined,
    };
  }
}

export class InstagramContentMetricsProvider extends BaseEntityProvider {
  constructor() {
    super("content-metrics.provider.instagram");
  }

  override supports(target: ContentMetricsTarget): boolean {
    return EntInstagramPublishedContent.supports(target);
  }

  protected override async fetchOne(
    target: ContentMetricsTarget,
  ): Promise<ProviderFetchSuccess | null> {
    const originalSourceId = target.sourceContentId;
    const entity = EntInstagramPublishedContent.fromTarget(target);
    const metrics = await entity.fetchMetrics();
    if (!metrics) return null;

    return {
      contentId: target.id,
      metrics,
      normalizedSourceContentId:
        entity.target.sourceContentId !== originalSourceId
          ? (entity.target.sourceContentId ?? undefined)
          : undefined,
    };
  }
}
