import { db } from "@core/helpers/db";
import { hashtagSnapshotTable } from "@core/schemas/hashtag.sql";
import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";
import { AllPlatforms } from "@shared/content";
import type {
  HashtagSuggestion,
  HashtagSuggestionStat,
} from "@shared/hashtags";
import { and, desc, gt, ilike, sql } from "drizzle-orm";

type ProviderSnapshot = {
  normalizedTag: string;
  displayTag?: string;
  platform: AllPlatforms;
  usageCount?: number;
  viewCount?: number;
  metadata?: Record<string, unknown>;
  fetchedAt?: Date;
};

type TikHubInstagramResponse = {
  code: number;
  cache_url?: string;
  data?: {
    hashtags?: Array<{
      position?: number;
      hashtag: {
        name: string;
        media_count?: number;
        id?: string;
      };
    }>;
  };
};

type TikHubTikTokResponse = {
  code: number;
  cache_url?: string;
  data?: {
    challenge_list?: Array<{
      challenge_info?: {
        cha_name: string;
        search_cha_name?: string;
        cid?: string;
        use_count?: number;
        view_count?: number;
        user_count?: number;
        share_info?: {
          share_url?: string;
          share_desc?: string;
        };
        desc?: string;
      };
    }>;
  };
};

const MAX_SEARCH_RESULTS = 60;
const MAX_SUGGESTIONS = 20;
const MIN_QUERY_LENGTH = 2;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class HashtagService {
  private readonly log = Log.create({ namespace: "hashtag.service" });
  private readonly apiKey = env.TIKHUB_API_TOKEN;
  private readonly baseUrl = "https://api.tikhub.io";

  async search(query: string): Promise<HashtagSuggestion[]> {
    const sanitized = this.sanitizeQuery(query);
    const normalized = sanitized.toLowerCase();

    if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
      return [];
    }

    try {
      await this.refreshProviders(sanitized, normalized);
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(error);
      } else {
        this.log.warn("failed refreshing providers", { error });
      }
    }

    const rows = await db()
      .select()
      .from(hashtagSnapshotTable)
      .where(ilike(hashtagSnapshotTable.normalizedTag, `${normalized}%`))
      .orderBy(
        desc(hashtagSnapshotTable.usageCount),
        desc(hashtagSnapshotTable.viewCount),
        desc(hashtagSnapshotTable.lastFetchedAt),
      )
      .limit(MAX_SEARCH_RESULTS);

    const grouped = new Map<
      string,
      {
        normalizedTag: string;
        displayTag?: string;
        stats: HashtagSuggestionStat[];
      }
    >();

    for (const row of rows) {
      const key = row.normalizedTag;
      const existing = grouped.get(key);
      const stat: HashtagSuggestionStat = {
        platform: row.platform as AllPlatforms,
        usageCount: row.usageCount ?? undefined,
        viewCount: row.viewCount ?? undefined,
        lastFetchedAt: row.lastFetchedAt,
        metadata: row.metadata ?? undefined,
      };
      if (existing) {
        existing.stats.push(stat);
        if (!existing.displayTag && row.displayTag) {
          existing.displayTag = row.displayTag;
        }
      } else {
        grouped.set(key, {
          normalizedTag: key,
          displayTag: row.displayTag ?? row.normalizedTag,
          stats: [stat],
        });
      }
    }

    const suggestions = Array.from(grouped.values()).map((entry) => {
      entry.stats.sort(
        (a, b) =>
          (b.usageCount ?? b.viewCount ?? 0) -
          (a.usageCount ?? a.viewCount ?? 0),
      );
      return entry;
    });

    suggestions.sort((a, b) => {
      const bestScore = (stat: HashtagSuggestionStat) =>
        stat.usageCount ?? stat.viewCount ?? 0;

      const scoreA = Math.max(...a.stats.map(bestScore));
      const scoreB = Math.max(...b.stats.map(bestScore));
      if (scoreA === scoreB) {
        const lastFetchedA = Math.max(
          ...a.stats.map((stat) => stat.lastFetchedAt.getTime()),
        );
        const lastFetchedB = Math.max(
          ...b.stats.map((stat) => stat.lastFetchedAt.getTime()),
        );
        return lastFetchedB - lastFetchedA;
      }
      return scoreB - scoreA;
    });

    return suggestions.slice(0, MAX_SUGGESTIONS).map((entry) => ({
      normalizedTag: entry.normalizedTag,
      displayTag: entry.displayTag,
      stats: entry.stats,
    })) satisfies HashtagSuggestion[];
  }

  private async refreshProviders(
    rawQuery: string,
    normalizedQuery: string,
  ): Promise<void> {
    if (rawQuery.length < MIN_QUERY_LENGTH || !this.apiKey) {
      if (!this.apiKey) {
        this.log.warn("tikhub api key missing; skipping provider fetch");
      }
      return;
    }

    const isFresh = await this.hasFreshSnapshots(normalizedQuery);
    if (isFresh) {
      return;
    }

    const [instagram, tiktok] = await Promise.all([
      this.fetchInstagram(rawQuery),
      this.fetchTikTok(rawQuery),
    ]);

    const snapshots = [...instagram, ...tiktok];
    if (snapshots.length === 0) return;

    const now = new Date();
    await db()
      .insert(hashtagSnapshotTable)
      .values(
        snapshots.map((snapshot) => ({
          normalizedTag: snapshot.normalizedTag,
          displayTag: snapshot.displayTag ?? null,
          platform: snapshot.platform,
          usageCount:
            typeof snapshot.usageCount === "number"
              ? snapshot.usageCount
              : null,
          viewCount:
            typeof snapshot.viewCount === "number" ? snapshot.viewCount : null,
          metadata: snapshot.metadata ?? null,
          lastFetchedAt: snapshot.fetchedAt ?? now,
        })),
      )
      .onConflictDoUpdate({
        target: [
          hashtagSnapshotTable.platform,
          hashtagSnapshotTable.normalizedTag,
        ],
        set: {
          displayTag: sql`excluded.display_tag`,
          usageCount: sql`excluded.usage_count`,
          viewCount: sql`excluded.view_count`,
          metadata: sql`excluded.metadata`,
          lastFetchedAt: sql`excluded.last_fetched_at`,
        },
      });
  }

  private async hasFreshSnapshots(normalizedTag: string) {
    const threshold = new Date(Date.now() - REFRESH_INTERVAL_MS);
    const result = await db()
      .select({ lastFetchedAt: hashtagSnapshotTable.lastFetchedAt })
      .from(hashtagSnapshotTable)
      .where(
        and(
          ilike(hashtagSnapshotTable.normalizedTag, `${normalizedTag}%`),
          gt(hashtagSnapshotTable.lastFetchedAt, threshold),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  private async fetchInstagram(query: string): Promise<ProviderSnapshot[]> {
    const url = new URL(
      "/api/v1/instagram/web_app/fetch_search_hashtags_by_keyword",
      this.baseUrl,
    );
    url.searchParams.set("keyword", query);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      this.log.warn("instagram fetch failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const body = (await response.json()) as TikHubInstagramResponse;
    if (!body?.data?.hashtags) {
      return [];
    }

    const fetchedAt = new Date();
    return body.data.hashtags
      .filter((entry) => entry?.hashtag?.name)
      .map((entry) => {
        const hashtag = entry.hashtag;
        const name = hashtag.name.trim();
        return {
          normalizedTag: name.toLowerCase(),
          displayTag: name,
          platform: AllPlatforms.INSTAGRAM,
          usageCount:
            typeof hashtag.media_count === "number"
              ? hashtag.media_count
              : undefined,
          metadata: {
            provider: "tikhub",
            providerId: hashtag.id,
            position: entry.position,
            cacheUrl: body.cache_url,
          },
          fetchedAt,
        } satisfies ProviderSnapshot;
      });
  }

  private async fetchTikTok(query: string): Promise<ProviderSnapshot[]> {
    const url = new URL(
      "/api/v1/tiktok/app/v3/fetch_hashtag_search_result",
      this.baseUrl,
    );
    url.searchParams.set("keyword", query);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      this.log.warn("tiktok fetch failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const body = (await response.json()) as TikHubTikTokResponse;
    if (!body?.data?.challenge_list) {
      return [];
    }

    const fetchedAt = new Date();
    return body.data.challenge_list
      .map((entry) => entry.challenge_info)
      .filter((info): info is NonNullable<typeof info> => !!info?.cha_name)
      .map((info) => {
        const name = info.cha_name.trim();
        const metadata: Record<string, unknown> = {
          provider: "tikhub",
          providerId: info.cid,
          cacheUrl: body.cache_url,
          shareUrl: info.share_info?.share_url,
          shareDescription: info.share_info?.share_desc,
          description: info.desc,
        };
        if (typeof info.user_count === "number") {
          metadata.userCount = info.user_count;
        }
        return {
          normalizedTag: name.toLowerCase(),
          displayTag: name,
          platform: AllPlatforms.TIKTOK,
          usageCount:
            typeof info.use_count === "number" ? info.use_count : undefined,
          viewCount:
            typeof info.view_count === "number" ? info.view_count : undefined,
          metadata,
          fetchedAt,
        } satisfies ProviderSnapshot;
      });
  }

  private sanitizeQuery(query: string) {
    const trimmed = query.trim().replace(/^#+/, "");
    return trimmed.split(/\s+/)[0] ?? "";
  }

  private buildHeaders() {
    if (!this.apiKey) throw new Error("TikHub API key is not configured");
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
  }
}
