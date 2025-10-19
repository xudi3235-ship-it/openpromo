import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

const BASE_URL = "https://open.tiktokapis.com";
const MAX_IDS_PER_REQUEST = 20;

const DEFAULT_FIELDS = [
  "id",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
] as const;

type TikTokAPIError = {
  code?: string | number;
  message?: string;
  log_id?: string;
};

type TikTokVideoQueryResponse = {
  data?: {
    videos?: TikTokVideoObject[];
  };
  error?: TikTokAPIError;
};

export type TikTokVideoObject = {
  id: string;
  view_count?: number | string | null;
  like_count?: number | string | null;
  comment_count?: number | string | null;
  share_count?: number | string | null;
  [key: string]: unknown;
};

export type TikTokVideoMetricsFetchParams = {
  videoIds: string[];
  fields?: string[];
  maxIdsPerRequest?: number;
};

type TikTokVideoMetricsFetcherDependencies = {
  fetchImpl?: typeof fetch;
  logger?: ReturnType<typeof Log.create>;
  baseUrl?: string;
  maxIdsPerRequest?: number;
};

function normalizeIds(ids: string[]): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id?.length)),
    ),
  );
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export class TikTokVideoMetricsFetcher {
  private readonly fetchImpl: typeof fetch;
  private readonly log: ReturnType<typeof Log.create>;
  private readonly baseUrl: string;
  private readonly maxIdsPerRequest: number;

  constructor(deps: TikTokVideoMetricsFetcherDependencies = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.log = deps.logger ?? Log.create({ namespace: "tiktok-video-metrics" });
    this.baseUrl = deps.baseUrl ?? BASE_URL;
    this.maxIdsPerRequest = deps.maxIdsPerRequest ?? MAX_IDS_PER_REQUEST;
  }

  async fetch(
    ctx: { accessToken: string },
    params: TikTokVideoMetricsFetchParams,
  ): Promise<{ videos: TikTokVideoObject[]; missingIds: string[] }> {
    const ids = normalizeIds(params.videoIds ?? []);
    if (ids.length === 0) {
      throw new Error("videoIds are required for TikTok metrics");
    }

    const fields = normalizeIds(
      params.fields && params.fields.length > 0
        ? params.fields
        : [...DEFAULT_FIELDS],
    );

    const chunkSize = Math.max(
      1,
      Math.min(
        params.maxIdsPerRequest ?? this.maxIdsPerRequest,
        this.maxIdsPerRequest,
      ),
    );

    const chunks = chunk(ids, chunkSize);
    const collected: TikTokVideoObject[] = [];
    const missing: string[] = [];

    for (const chunkIds of chunks) {
      const url = new URL("/v2/video/query/", this.baseUrl);
      url.searchParams.set("fields", fields.join(","));

      this.log.info("fetching tiktok video metrics", {
        requestedIds: chunkIds,
        fieldCount: fields.length,
      });

      const response = await this.fetchImpl(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            video_ids: chunkIds,
          },
        }),
      });

      let json: TikTokVideoQueryResponse;
      try {
        json = (await response.json()) as TikTokVideoQueryResponse;
      } catch (error) {
        this.log.warn("failed to parse tiktok response", {
          error: (error as Error).message,
        });
        throw new Error("invalid TikTok response payload");
      }

      const apiError = json.error;
      const hasError =
        !response.ok ||
        (apiError && apiError.code !== undefined && apiError.code !== "ok");
      if (hasError) {
        this.log.warn("tiktok metrics request failed", {
          requestedIds: chunkIds,
          status: `${response.status} ${response.statusText}`,
          error: apiError?.code,
          message: apiError?.message,
          logId: apiError?.log_id,
        });
        throw new Error(
          `TikTok metrics request failed: ${
            apiError?.message ?? response.statusText
          }`,
        );
      }

      const videos = json.data?.videos ?? [];
      collected.push(...videos);

      const foundIds = new Set(videos.map((video) => video.id));
      for (const id of chunkIds) {
        if (!foundIds.has(id)) {
          missing.push(id);
        }
      }
    }

    return {
      videos: collected,
      missingIds: Array.from(new Set(missing)),
    };
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function tikTokVideoMetricsToUnifiedContentMetrics(
  video: TikTokVideoObject,
): UnifiedContentMetrics {
  const impressions = toNumber(video.view_count);
  const likes = toNumber(video.like_count) ?? 0;
  const comments = toNumber(video.comment_count) ?? 0;
  const shares = toNumber(video.share_count) ?? 0;

  const engagement = likes + comments + shares;

  return {
    impressions,
    reach: impressions,
    engagement,
    likes,
    comments,
    shares,
  };
}
