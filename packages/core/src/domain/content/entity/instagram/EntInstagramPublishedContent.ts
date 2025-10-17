import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { ContentMetricsTarget } from "@core/domain/content/metrics";
import { Ent } from "@core/helpers/ent";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import {
  INSTAGRAM_MEDIA_DEFAULT_METRICS,
  InstagramMediaInsightsFetcher,
  instagramMediaMetricsToUnifiedContentMetrics,
} from "./mediaInsights";

const log = Log.create({ namespace: "instagram-published-content" });
const insightsFetcher = new InstagramMediaInsightsFetcher();

export class EntInstagramPublishedContent extends Ent<ContentMetricsTarget> {
  static override type = "instagram_published_content";

  constructor(target: ContentMetricsTarget) {
    super(target);
    if (!EntInstagramPublishedContent.supports(target)) {
      throw new Error(
        `Unsupported placement for Instagram metrics: ${target.placement}`,
      );
    }
  }

  static supports(target: ContentMetricsTarget): boolean {
    return target.placement === "IG_FEED";
  }

  static fromTarget(target: ContentMetricsTarget) {
    return new EntInstagramPublishedContent(target);
  }

  get target(): ContentMetricsTarget {
    return this.data;
  }

  async fetchMetrics(): Promise<UnifiedContentMetrics | null> {
    if (!this.target.sourceContentId || !this.target.connectedAccountId) {
      log.warn("instagram metrics missing identifiers", {
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

    log.info("fetching instagram metrics", {
      contentId: this.target.id,
      sourceContentId: this.target.sourceContentId,
    });

    const { metrics } = await insightsFetcher.fetch(ctx, {
      mediaId: this.target.sourceContentId,
      metrics: Array.from(INSTAGRAM_MEDIA_DEFAULT_METRICS.FEED),
      metricBreakdowns: {
        profile_activity: "action_type",
      },
    });

    return instagramMediaMetricsToUnifiedContentMetrics(metrics);
  }
}
