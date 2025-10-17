import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { ContentMetricsTarget } from "@core/domain/content/metrics";
import { Ent } from "@core/helpers/ent";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import {
  FacebookPostMetricsFetcher,
  type FacebookPostMetricsValue,
} from "./postMetrics";

const log = Log.create({ namespace: "facebook-published-content" });
const metricsFetcher = new FacebookPostMetricsFetcher();

const DEFAULT_FACEBOOK_POST_METRICS = [
  "post_impressions_unique",
  "post_impressions",
  "post_engaged_users",
  "post_reactions_by_type_total",
  "post_reactions",
  "post_comments",
  "post_shares",
] as const;

function coerceNumber(value: FacebookPostMetricsValue | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumReactionTotals(
  value: FacebookPostMetricsValue | null | undefined,
): number {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).reduce<number>((total, entry) => {
      if (typeof entry === "number") return total + entry;
      if (typeof entry === "string") {
        const parsed = Number(entry);
        return total + (Number.isFinite(parsed) ? parsed : 0);
      }
      return total;
    }, 0);
  }
  return coerceNumber(value);
}

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
      metrics: Array.from(DEFAULT_FACEBOOK_POST_METRICS),
      period: "lifetime",
    });

    return {
      reach: coerceNumber(metrics.post_impressions_unique),
      impressions: coerceNumber(metrics.post_impressions),
      engagement: coerceNumber(metrics.post_engaged_users),
      comments: coerceNumber(metrics.post_comments),
      shares: coerceNumber(metrics.post_shares),
      likes:
        sumReactionTotals(metrics.post_reactions_by_type_total) ||
        coerceNumber(metrics.post_reactions),
    } satisfies UnifiedContentMetrics;
  }
}
