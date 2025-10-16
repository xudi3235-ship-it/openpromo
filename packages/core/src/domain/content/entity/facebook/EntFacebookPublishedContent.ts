import type { ContentMetricsTarget } from "@core/domain/content/metrics";
import { Ent } from "@core/helpers/ent";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "facebook-published-content" });

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

    // TODO: integrate with facebookGraphRequest + insights API.
    log.info("fetching facebook metrics (stub)", {
      contentId: this.target.id,
      sourceContentId: this.target.sourceContentId,
    });

    return {
      reach: 0,
      impressions: 0,
      engagement: 0,
      comments: 0,
      shares: 0,
      likes: 0,
    } satisfies UnifiedContentMetrics;
  }
}
