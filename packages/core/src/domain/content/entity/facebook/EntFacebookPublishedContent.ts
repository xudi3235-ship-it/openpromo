import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { ContentMetricsTarget } from "@core/domain/content/metrics";
import { Ent } from "@core/helpers/ent";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import {
  FACEBOOK_POST_DEFAULT_METRICS,
  FacebookPostMetricsFetcher,
  facebookPostMetricsToUnifiedContentMetrics,
} from "./postMetrics";

const log = Log.create({ namespace: "facebook-published-content" });
const metricsFetcher = new FacebookPostMetricsFetcher();

/**
 * Lightweight wrapper around a published Facebook feed unified content entry.
 */
export class EntFacebookPublishedContent extends Ent<ContentMetricsTarget> {
  static override type = "facebook_published_content";

  constructor(target: ContentMetricsTarget) {
    super(target);
    if (!EntFacebookPublishedContent.supports(target)) {
      throw new Error(
        `Unsupported placement for Facebook metrics: ${target.placement}`,
      );
    }
  }

  static supports(target: ContentMetricsTarget): boolean {
    return target.placement === "FB_FEED";
  }

  static fromTarget(target: ContentMetricsTarget) {
    return new EntFacebookPublishedContent(target);
  }

  get target(): ContentMetricsTarget {
    return this.data;
  }

  async fetchMetrics(): Promise<UnifiedContentMetrics | null> {
    if (!this.target.sourceContentId || !this.target.connectedAccountId) {
      log.warn("facebook metrics missing identifiers", {
        contentId: this.target.id,
        sourceContentId: this.target.sourceContentId,
        connectedAccountId: this.target.connectedAccountId,
      });
      return null;
    }

    const account = await ConnectedAccount.fromID(
      this.target.connectedAccountId,
    );

    const ctx = {
      accessToken: account.encryptedAccessToken,
    };

    const metadataPageId =
      (account.metadata as { pageID?: string; pageId?: string })?.pageID ??
      (account.metadata as { pageID?: string; pageId?: string })?.pageId;

    const postId = this.normalizePostId(
      account.externalAccountId,
      metadataPageId,
      this.target.sourceContentId,
    );

    if (!postId) {
      log.warn("facebook metrics normalization failed", {
        contentId: this.target.id,
        sourceContentId: this.target.sourceContentId,
        pageId: account.externalAccountId,
      });
      return null;
    }

    const normalizedSourceContentId =
      postId !== this.target.sourceContentId ? postId : undefined;

    if (normalizedSourceContentId) {
      log.info("normalized facebook post id for metrics fetch", {
        contentId: this.target.id,
        original: this.target.sourceContentId,
        normalized: normalizedSourceContentId,
      });
      (
        this.data as ContentMetricsTarget & {
          sourceContentId: string | null;
        }
      ).sourceContentId = normalizedSourceContentId;
    }

    const effectivePostId =
      this.target.sourceContentId ?? normalizedSourceContentId ?? postId;

    log.info("fetching facebook metrics", {
      contentId: this.target.id,
      sourceContentId: effectivePostId,
    });

    const { metrics } = await metricsFetcher.fetch(ctx, {
      postId: effectivePostId,
      metrics: Array.from(FACEBOOK_POST_DEFAULT_METRICS),
      period: "lifetime",
    });

    return facebookPostMetricsToUnifiedContentMetrics(metrics);
  }

  private normalizePostId(
    externalAccountId: string,
    metadataPageId: string | undefined,
    sourceContentId: string | null,
  ): string | null {
    if (!sourceContentId) return null;
    if (sourceContentId.includes("_")) {
      return sourceContentId;
    }
    const candidates = [externalAccountId, metadataPageId];
    let pageId: string | null = null;
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        pageId = candidate.includes("_")
          ? (candidate.split("_", 1)[0] ?? null)
          : candidate;
        if (pageId) break;
      }
    }
    if (!pageId) {
      return null;
    }
    return `${pageId}_${sourceContentId}`;
  }
}
