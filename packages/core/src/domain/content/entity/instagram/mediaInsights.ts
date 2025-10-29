import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import type { InstagramIdentityContext } from "./api";
import { instagramGraphRequest } from "./api";

const DEFAULT_MAX_METRICS_PER_REQUEST = 10;

export type InstagramMediaType = "FEED" | "REELS" | "STORY";

export type InstagramMediaMetricName = string;

const COMMON_METRICS = [
  "reach",
  "shares",
  "total_interactions",
  "views",
] as const satisfies readonly InstagramMediaMetricName[];

const FEED_AND_REELS_METRICS = [
  "comments",
  "likes",
  "saved",
] as const satisfies readonly InstagramMediaMetricName[];

const FEED_AND_STORY_METRICS = [
  "follows",
  "profile_activity",
  "profile_visits",
] as const satisfies readonly InstagramMediaMetricName[];

const REELS_ONLY_METRICS = [
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
] as const satisfies readonly InstagramMediaMetricName[];

const STORY_ONLY_METRICS = [
  "navigation",
  "replies",
] as const satisfies readonly InstagramMediaMetricName[];

export const INSTAGRAM_MEDIA_DEFAULT_METRICS: Record<
  InstagramMediaType,
  readonly InstagramMediaMetricName[]
> = {
  FEED: [
    ...COMMON_METRICS,
    ...FEED_AND_REELS_METRICS,
    ...FEED_AND_STORY_METRICS,
  ],
  REELS: [...COMMON_METRICS, ...FEED_AND_REELS_METRICS, ...REELS_ONLY_METRICS],
  STORY: [...COMMON_METRICS, ...FEED_AND_STORY_METRICS, ...STORY_ONLY_METRICS],
};

export type InstagramMediaMetricsFetchParams = {
  mediaId: string;
  metrics: InstagramMediaMetricName[];
  metricBreakdowns?: Record<string, string | undefined>;
  apiVersion?: string;
  host?: "graph.facebook.com" | "graph.instagram.com";
  maxMetricsPerRequest?: number;
};

export type InstagramInsightValue =
  | number
  | string
  | Record<string, unknown>
  | unknown[]
  | null;

export type InstagramInsightBreakdown = Record<string, number>;

export type InstagramInsightEntry = {
  name?: string;
  period?: string;
  values?: Array<
    | {
        value?: InstagramInsightValue;
      }
    | null
    | undefined
  >;
  total_value?: {
    value?: InstagramInsightValue;
    breakdowns?: Array<
      | {
          dimension_values?: string[];
          value?: number;
        }
      | null
      | undefined
    >;
  };
};

type InstagramInsightsResponse = {
  data?: InstagramInsightEntry[];
};

export type InstagramMediaMetricResult = {
  value: InstagramInsightValue;
  breakdown?: InstagramInsightBreakdown;
};

export type InstagramMediaMetricsValueMap = Record<
  string,
  InstagramMediaMetricResult
>;

export type InstagramMediaMetricsResult = {
  mediaId: string;
  entries: InstagramInsightEntry[];
  metrics: InstagramMediaMetricsValueMap;
};

type InstagramMediaInsightsFetcherDependencies = {
  logger?: ReturnType<typeof Log.create>;
  request?: typeof instagramGraphRequest;
  defaultHost?: "graph.facebook.com" | "graph.instagram.com";
  defaultApiVersion?: string;
};

export class InstagramMediaInsightsFetcher {
  private readonly log: ReturnType<typeof Log.create>;
  private readonly request: typeof instagramGraphRequest;
  private readonly defaultHost: "graph.facebook.com" | "graph.instagram.com";
  private readonly defaultApiVersion: string;
  private readonly defaultChunkSize: number;

  constructor(dependencies: InstagramMediaInsightsFetcherDependencies = {}) {
    this.log =
      dependencies.logger ??
      Log.create({ namespace: "instagram-media-insights" });
    this.request = dependencies.request ?? instagramGraphRequest;
    this.defaultHost = dependencies.defaultHost ?? "graph.instagram.com";
    this.defaultApiVersion = dependencies.defaultApiVersion ?? "v24.0";
    this.defaultChunkSize = DEFAULT_MAX_METRICS_PER_REQUEST;
  }

  async fetch(
    ctx: Pick<InstagramIdentityContext, "accessToken" | "rateLimitKey">,
    params: InstagramMediaMetricsFetchParams,
  ): Promise<InstagramMediaMetricsResult> {
    if (!params.mediaId) {
      throw new Error("mediaId is required to fetch Instagram insights");
    }
    const metrics = this.normalizeMetrics(params.metrics);
    if (metrics.length === 0) {
      throw new Error("at least one metric must be specified");
    }

    const chunkSize =
      params.maxMetricsPerRequest ?? this.defaultChunkSize ?? metrics.length;
    if (chunkSize <= 0) {
      throw new Error("maxMetricsPerRequest must be greater than zero");
    }

    const apiVersion = params.apiVersion ?? this.defaultApiVersion;
    const host = params.host ?? this.defaultHost;

    const metricGroups = this.groupMetricsByBreakdown(
      metrics,
      params.metricBreakdowns,
      chunkSize,
    );

    const entries: InstagramInsightEntry[] = [];

    for (const group of metricGroups) {
      const searchParams: Record<string, string | undefined> = {
        metric: group.metrics.join(","),
      };

      if (group.breakdown) {
        searchParams.breakdown = group.breakdown;
      }

      this.log.info("fetching instagram media metrics", {
        mediaId: params.mediaId,
        metricCount: group.metrics.length,
        breakdown: group.breakdown,
        host,
        apiVersion,
      });

      const response = await this.request<InstagramInsightsResponse>(
        { accessToken: ctx.accessToken, rateLimitKey: ctx.rateLimitKey },
        `/${params.mediaId}/insights`,
        {
          searchParams,
          apiVersion: apiVersion,
          host,
        },
      );

      entries.push(...(response.data ?? []));
    }

    return {
      mediaId: params.mediaId,
      entries,
      metrics: this.toValueMap(entries),
    };
  }

  private normalizeMetrics(metrics: InstagramMediaMetricName[]): string[] {
    return Array.from(
      new Set(
        metrics
          .map((metric) => metric?.trim())
          .filter((metric): metric is string => metric.length > 0),
      ),
    );
  }

  private groupMetricsByBreakdown(
    metrics: string[],
    metricBreakdowns: InstagramMediaMetricsFetchParams["metricBreakdowns"],
    chunkSize: number,
  ): Array<{ metrics: string[]; breakdown?: string }> {
    const buckets = new Map<string, string[]>();

    for (const metric of metrics) {
      const breakdown = metricBreakdowns?.[metric];
      const key = breakdown ?? "__default__";
      const list = buckets.get(key) ?? [];
      list.push(metric);
      buckets.set(key, list);
    }

    const result: Array<{ metrics: string[]; breakdown?: string }> = [];

    for (const [key, list] of buckets.entries()) {
      for (let index = 0; index < list.length; index += chunkSize) {
        result.push({
          metrics: list.slice(index, index + chunkSize),
          breakdown: key === "__default__" ? undefined : key,
        });
      }
    }

    return result;
  }

  private toValueMap(
    entries: InstagramInsightEntry[],
  ): InstagramMediaMetricsValueMap {
    const map: InstagramMediaMetricsValueMap = {};

    for (const entry of entries) {
      if (!entry?.name) continue;

      const value = this.extractValue(entry);
      const breakdown = this.extractBreakdown(entry);
      map[entry.name] = { value, breakdown };
    }

    return map;
  }

  private extractValue(entry: InstagramInsightEntry): InstagramInsightValue {
    const values = entry.values ?? [];
    if (values.length > 0) {
      const last = values[values.length - 1];
      if (last && typeof last.value !== "undefined") {
        return last.value ?? null;
      }
    }

    if (entry.total_value && typeof entry.total_value.value !== "undefined") {
      return entry.total_value.value ?? null;
    }

    return null;
  }

  private extractBreakdown(
    entry: InstagramInsightEntry,
  ): InstagramInsightBreakdown | undefined {
    const breakdowns = entry.total_value?.breakdowns ?? [];
    if (!breakdowns || breakdowns.length === 0) {
      return undefined;
    }

    const result: InstagramInsightBreakdown = {};
    for (const record of breakdowns) {
      if (!record || typeof record.value !== "number") continue;
      const dimensionValues = record.dimension_values ?? [];
      if (dimensionValues.length === 0) continue;
      const key = dimensionValues.join(":");
      result[key] = record.value;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }
}

function coerceNumber(value: InstagramInsightValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumBreakdown(
  breakdown: InstagramInsightBreakdown | undefined,
  match: RegExp,
): number {
  if (!breakdown) return 0;
  let total = 0;
  for (const [key, value] of Object.entries(breakdown)) {
    if (match.test(key)) {
      total += value;
    }
  }
  return total;
}

export function instagramMediaMetricsToUnifiedContentMetrics(
  metrics: InstagramMediaMetricsValueMap,
): UnifiedContentMetrics {
  const reach = coerceNumber(metrics["reach"]?.value ?? null);
  const impressionsRaw = coerceNumber(metrics["views"]?.value ?? null);
  const impressions = impressionsRaw > 0 ? impressionsRaw : reach;
  const engagementRaw = coerceNumber(
    metrics["total_interactions"]?.value ?? null,
  );
  const likes = coerceNumber(metrics["likes"]?.value ?? null);
  const comments = coerceNumber(metrics["comments"]?.value ?? null);
  const shares = coerceNumber(metrics["shares"]?.value ?? null);
  const profileVisits = coerceNumber(metrics["profile_visits"]?.value ?? null);
  const saves = coerceNumber(metrics["saved"]?.value ?? null);

  const profileActivityBreakdown = metrics["profile_activity"]?.breakdown;
  const derivedClicks = sumBreakdown(profileActivityBreakdown, /.*/);

  const engagement =
    engagementRaw > 0 ? engagementRaw : likes + comments + shares + saves;

  return {
    reach,
    impressions,
    engagement,
    clicks: profileVisits || derivedClicks,
    likes,
    comments,
    shares,
  };
}
