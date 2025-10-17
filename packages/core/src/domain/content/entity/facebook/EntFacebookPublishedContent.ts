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

    log.info("fetching facebook metrics", {
      contentId: this.target.id,
      sourceContentId: this.target.sourceContentId,
    });

    const { metrics } = await metricsFetcher.fetch(ctx, {
      postId: this.target.sourceContentId,
      metrics: Array.from(FACEBOOK_POST_DEFAULT_METRICS),
      period: "lifetime",
    });

    return facebookPostMetricsToUnifiedContentMetrics(metrics);
  }
}
