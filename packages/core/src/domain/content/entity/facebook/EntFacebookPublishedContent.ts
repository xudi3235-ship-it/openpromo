import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { ContentMetricsTarget } from "@core/domain/content/metrics";
import { Ent } from "@core/helpers/ent";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import { facebookGraphRequest } from "./api";

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

    // https://developers.facebook.com/docs/graph-api/reference/v24.0/insights
    const response = await facebookGraphRequest<{
      data?: Array<{
        name?: string;
        values?: Array<{ value?: number } | null>;
      }>;
    }>(ctx, `/${this.target.sourceContentId}/insights`, {
      searchParams: {
        metric: [
          "post_impressions_unique",
          "post_impressions",
          "post_engaged_users",
          "post_reactions_by_type_total",
          "post_comments",
          "post_shares",
        ].join(","),
      },
    });

    const metrics = new Map<string, number>();

    for (const entry of response.data ?? []) {
      if (!entry?.name) continue;
      const first = entry.values?.[0];
      const value = (first as { value?: number } | null)?.value;
      if (typeof value === "number") {
        metrics.set(entry.name, value);
      }
    }

    return {
      reach: metrics.get("post_impressions_unique") ?? 0,
      impressions: metrics.get("post_impressions") ?? 0,
      engagement: metrics.get("post_engaged_users") ?? 0,
      comments: metrics.get("post_comments") ?? 0,
      shares: metrics.get("post_shares") ?? 0,
      likes:
        metrics.get("post_reactions_by_type_total") ??
        metrics.get("post_reactions") ??
        0,
    } satisfies UnifiedContentMetrics;
  }
}
