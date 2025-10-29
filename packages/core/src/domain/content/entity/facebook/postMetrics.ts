import type { FacebookIdentityContext } from "@core/domain/content/entity/facebook/api";
import {
  FacebookGraphError,
  facebookGraphRequest,
} from "@core/domain/content/entity/facebook/api";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

const DEFAULT_MAX_METRICS_PER_REQUEST = 10;
const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type FacebookPostMetricName = string;

export const FACEBOOK_POST_DEFAULT_METRICS = [
  // metrics def: https://developers.facebook.com/docs/graph-api/reference/v24.0/insights#page-posts
  "post_impressions_unique",
  "post_impressions",
  "post_clicks",
  "post_reactions_like_total",
  "post_reactions_love_total",
  "post_reactions_wow_total",
  "post_reactions_haha_total",
  "post_reactions_sorry_total",
  "post_reactions_anger_total",
] as const satisfies readonly FacebookPostMetricName[];

export type FacebookPostMetricsFetchParams = {
  postId: string;
  metrics: FacebookPostMetricName[];
  period?: string;
  since?: Date;
  until?: Date;
  datePreset?: string;
  maxMetricsPerRequest?: number;
  apiVersion?: string;
};

export type FacebookInsightValue =
  | number
  | Record<string, unknown>
  | unknown[]
  | string
  | null
  | undefined;

export type FacebookInsightEntry = {
  name?: string;
  period?: string;
  title?: string;
  description?: string;
  id?: string;
  values?: Array<
    | {
        value?: FacebookInsightValue;
        end_time?: string;
      }
    | null
    | undefined
  >;
};

type FacebookInsightsResponse = {
  data?: FacebookInsightEntry[];
};

export type FacebookPostMetricsValue =
  | number
  | Record<string, unknown>
  | unknown[]
  | string
  | null;

export type FacebookPostMetricsValueMap = Record<
  string,
  FacebookPostMetricsValue
>;

export type FacebookPostMetricsResult = {
  postId: string;
  entries: FacebookInsightEntry[];
  metrics: FacebookPostMetricsValueMap;
};

type FacebookPostMetricsFetcherDependencies = {
  graphRequest?: typeof facebookGraphRequest;
  logger?: ReturnType<typeof Log.create>;
  defaultApiVersion?: string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toUnixTimestamp(date: Date): string {
  return Math.floor(date.getTime() / 1000).toString();
}

function assertDateRange(since: Date, until: Date) {
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
    throw new Error("since and until must be valid dates");
  }
  if (since > until) {
    throw new Error("since must be before or equal to until");
  }
  const diffDays = (until.getTime() - since.getTime()) / MS_PER_DAY;
  if (diffDays > MAX_RANGE_DAYS) {
    throw new Error("requested range cannot exceed 90 days");
  }
}

export class FacebookPostMetricsFetcher {
  private readonly request: typeof facebookGraphRequest;
  private readonly log: ReturnType<typeof Log.create>;
  private readonly defaultApiVersion: string;
  private readonly defaultChunkSize: number;

  constructor(dependencies: FacebookPostMetricsFetcherDependencies = {}) {
    this.request = dependencies.graphRequest ?? facebookGraphRequest;
    this.log =
      dependencies.logger ?? Log.create({ namespace: "facebook-post-metrics" });
    this.defaultApiVersion = dependencies.defaultApiVersion ?? "v24.0";
    this.defaultChunkSize = DEFAULT_MAX_METRICS_PER_REQUEST;
  }

  async fetch(
    ctx: Pick<FacebookIdentityContext, "accessToken" | "rateLimitKey">,
    params: FacebookPostMetricsFetchParams,
  ): Promise<FacebookPostMetricsResult> {
    const metrics = this.normalizeMetrics(params.metrics);
    if (!params.postId) {
      throw new Error("postId is required to fetch metrics");
    }
    if (metrics.length === 0) {
      throw new Error("at least one metric must be specified");
    }

    const { since, until, datePreset } = params;

    if ((since && !until) || (!since && until)) {
      throw new Error("both since and until must be provided together");
    }

    if (datePreset && (since || until)) {
      throw new Error("datePreset cannot be used with since/until");
    }

    if (since && until) {
      assertDateRange(since, until);
    }

    const chunkSize =
      params.maxMetricsPerRequest ?? this.defaultChunkSize ?? metrics.length;
    if (chunkSize <= 0) {
      throw new Error("maxMetricsPerRequest must be greater than zero");
    }

    const apiVersion = params.apiVersion ?? this.defaultApiVersion;
    const entries: FacebookInsightEntry[] = [];
    const metricChunks = chunkArray(metrics, chunkSize);

    for (const chunk of metricChunks) {
      const searchParams = this.buildSearchParams(chunk, params);
      try {
        this.log.info("fetching facebook post metrics", {
          postId: params.postId,
          metricCount: chunk.length,
          apiVersion,
          period: params.period ?? "default",
          since: since?.toISOString(),
          until: until?.toISOString(),
          datePreset,
        });

        const response = await this.request<FacebookInsightsResponse>(
          ctx,
          `/${params.postId}/insights`,
          {
            searchParams,
            apiVersion,
          },
        );

        entries.push(...(response.data ?? []));
      } catch (error) {
        if (error instanceof FacebookGraphError) {
          this.log.warn("facebook graph api error while fetching metrics", {
            postId: params.postId,
            metrics: chunk,
            message: error.message,
          });
        } else {
          this.log.warn("unexpected error while fetching metrics", {
            postId: params.postId,
            metrics: chunk,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    }

    return {
      postId: params.postId,
      entries,
      metrics: this.toValueMap(entries),
    };
  }

  private normalizeMetrics(metrics: FacebookPostMetricName[]): string[] {
    return Array.from(
      new Set(
        metrics
          .map((metric) => metric?.trim())
          .filter((metric): metric is string => metric.length > 0),
      ),
    );
  }

  private buildSearchParams(
    metrics: string[],
    params: FacebookPostMetricsFetchParams,
  ): Record<string, string | undefined> {
    const searchParams: Record<string, string | undefined> = {
      metric: metrics.join(","),
    };

    if (params.period) {
      searchParams.period = params.period;
    }

    if (params.since && params.until) {
      searchParams.since = toUnixTimestamp(params.since);
      searchParams.until = toUnixTimestamp(params.until);
    } else if (params.datePreset) {
      searchParams.date_preset = params.datePreset;
    }

    return searchParams;
  }

  private toValueMap(
    entries: FacebookInsightEntry[],
  ): FacebookPostMetricsValueMap {
    const valueMap: FacebookPostMetricsValueMap = {};

    for (const entry of entries) {
      if (!entry?.name) continue;
      const value = this.extractLatestValue(entry.values ?? []);
      valueMap[entry.name] = value;
    }

    return valueMap;
  }

  private extractLatestValue(
    values: NonNullable<FacebookInsightEntry["values"]>,
  ): FacebookPostMetricsValue {
    for (let index = values.length - 1; index >= 0; index--) {
      const record = values[index];
      if (!record) continue;

      if (typeof record.value === "undefined") {
        continue;
      }

      const { value } = record;
      if (
        value === null ||
        typeof value === "number" ||
        typeof value === "string" ||
        Array.isArray(value) ||
        typeof value === "object"
      ) {
        return value;
      }
    }

    return null;
  }
}

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

export function facebookPostMetricsToUnifiedContentMetrics(
  metrics: FacebookPostMetricsValueMap,
): UnifiedContentMetrics {
  const activityTotals = extractActivityTotals(
    metrics.post_activity_by_action_type,
  );
  const reactionsTotal =
    coerceNumber(metrics.post_reactions_like_total) +
    coerceNumber(metrics.post_reactions_love_total) +
    coerceNumber(metrics.post_reactions_wow_total) +
    coerceNumber(metrics.post_reactions_haha_total) +
    coerceNumber(metrics.post_reactions_sorry_total) +
    coerceNumber(metrics.post_reactions_anger_total);
  const likesFromActivity = activityTotals.like ?? 0;
  const likesTotal = reactionsTotal > 0 ? reactionsTotal : likesFromActivity;

  return {
    reach: coerceNumber(metrics.post_impressions_unique),
    impressions: coerceNumber(metrics.post_impressions),
    engagement: coerceNumber(metrics.post_engaged_users),
    clicks: coerceNumber(metrics.post_clicks),
    comments: activityTotals.comment ?? 0,
    shares: activityTotals.share ?? 0,
    likes: likesTotal,
  };
}

function extractActivityTotals(
  value: FacebookPostMetricsValue | null | undefined,
): Record<string, number> {
  if (!value || Array.isArray(value)) return {};
  if (typeof value === "number") {
    // No breakdown info in this case.
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return coerceActivityMap(parsed);
    } catch {
      return {};
    }
  }
  return coerceActivityMap(value as Record<string, unknown>);
}

function coerceActivityMap(
  value: Record<string, unknown>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [action, raw] of Object.entries(value)) {
    if (typeof raw === "number") {
      result[action] = raw;
    } else if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        result[action] = parsed;
      }
    }
  }
  return result;
}
