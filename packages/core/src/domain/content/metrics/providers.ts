import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import {
  EntFacebookPublishedContent,
  EntInstagramPublishedContent,
} from "@core/domain/content/entity";
import {
  TikTokVideoMetricsFetcher,
  tikTokVideoMetricsToUnifiedContentMetrics,
} from "@core/domain/content/entity/tiktok/videoMetrics";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import { AllPlatforms } from "@shared/content";
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

export class TikTokContentMetricsProvider implements ContentMetricsProvider {
  private readonly fetcher = new TikTokVideoMetricsFetcher();
  private readonly log = Log.create({
    namespace: "content-metrics.provider.tiktok",
  });

  supports(target: ContentMetricsTarget): boolean {
    return target.placement === "TT_FEED";
  }

  async fetchBatch(
    targets: ContentMetricsTarget[],
  ): Promise<ProviderFetchResult> {
    if (targets.length === 0) {
      return { successes: [], failures: [] };
    }

    const successes: ProviderFetchSuccess[] = [];
    const failures: ProviderFetchFailure[] = [];
    const targetsByAccount = new Map<string, ContentMetricsTarget[]>();

    for (const target of targets) {
      if (!target.sourceContentId) {
        failures.push({
          contentId: target.id,
          reason: "missing TikTok source content id",
        });
        continue;
      }
      if (!target.connectedAccountId) {
        failures.push({
          contentId: target.id,
          reason: "missing TikTok connected account id",
        });
        continue;
      }
      const list = targetsByAccount.get(target.connectedAccountId) ?? [];
      list.push(target);
      targetsByAccount.set(target.connectedAccountId, list);
    }

    for (const [connectedAccountId, accountTargets] of targetsByAccount) {
      try {
        const baseAccount = await ConnectedAccount.fromID(connectedAccountId);
        if (baseAccount.platform !== AllPlatforms.TIKTOK) {
          for (const target of accountTargets) {
            failures.push({
              contentId: target.id,
              reason: "connected account is not TikTok",
            });
          }
          continue;
        }

        const resolvedAccount = await ConnectedAccount.fromTikTokAccountID(
          baseAccount.externalAccountId,
        );

        const ids = accountTargets
          .map((target) => target.sourceContentId)
          .filter((id): id is string => Boolean(id));

        if (ids.length === 0) {
          for (const target of accountTargets) {
            failures.push({
              contentId: target.id,
              reason: "missing TikTok source content id",
            });
          }
          continue;
        }

        const { videos, missingIds } = await this.fetcher.fetch(
          { accessToken: resolvedAccount.encryptedAccessToken },
          { videoIds: ids },
        );

        const videoById = new Map(videos.map((video) => [video.id, video]));

        const accountedIds = new Set<string>();

        for (const target of accountTargets) {
          const desiredId = target.sourceContentId;
          if (!desiredId) {
            failures.push({
              contentId: target.id,
              reason: "missing TikTok source content id",
            });
            continue;
          }
          const video =
            videoById.get(desiredId) ?? videoById.get(target.id) ?? null;
          if (!video) continue;

          accountedIds.add(video.id);
          successes.push({
            contentId: target.id,
            metrics: tikTokVideoMetricsToUnifiedContentMetrics(video),
            normalizedSourceContentId:
              video.id !== desiredId ? video.id : undefined,
          });
        }

        for (const missingId of missingIds) {
          const target = accountTargets.find(
            (item) => item.sourceContentId === missingId,
          );
          if (!target) continue;
          failures.push({
            contentId: target.id,
            reason: "TikTok metrics not returned",
          });
        }

        for (const target of accountTargets) {
          const desiredId = target.sourceContentId;
          if (!desiredId) continue;
          if (accountedIds.has(desiredId)) continue;
          const missingExplicitly = missingIds.includes(desiredId);
          const hasVideo =
            videoById.has(desiredId) || videoById.has(target.id ?? "");
          if (!missingExplicitly && !hasVideo) {
            failures.push({
              contentId: target.id,
              reason: "TikTok metrics not returned",
            });
          }
        }
      } catch (error) {
        this.log.warn("failed to fetch tiktok metrics", {
          connectedAccountId,
          error: error instanceof Error ? error.message : String(error),
        });
        for (const target of accountTargets) {
          failures.push({
            contentId: target.id,
            reason:
              error instanceof Error && error.message
                ? error.message
                : "failed to fetch TikTok metrics",
          });
        }
      }
    }

    return { successes, failures };
  }
}
