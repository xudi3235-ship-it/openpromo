import { DurableObject } from "cloudflare:workers";
import type { ApiEnv } from "@core/helpers/api-env";
import type { AllPlatforms } from "@shared/content";

// NOTE: all these runtime params should be Rpc.Serializable.
export type RateLimitSnapshot = {
  callCount?: number;
  totalCpuTime?: number;
  totalTime?: number;
  estimatedTimeToRegainAccess?: number;
  lastUpdatedAt: number;
  pausedUntil?: number | null;
  headers?: Record<string, string | number | boolean | null | undefined>;
};

export type ReserveResponse = {
  allowed: boolean;
  waitUntil?: number;
  snapshot: RateLimitSnapshot;
};

export type ReportHeadersRequest = {
  cost: number;
  timestamp: number;
  headers: Record<string, string | number | boolean | null | undefined>;
  throttled?: boolean;
  platform?: AllPlatforms; // optional platform identifier to select parser
};

/**
 * Platform-specific rate limit parser.
 * Each platform can implement its own parsing logic for rate limit headers.
 */
export interface RateLimitParser {
  /**
   * Parse platform-specific headers into normalized rate limit data.
   * @returns Partial snapshot data, or null if this parser doesn't apply
   */
  parse(
    headers: Record<string, string | number | boolean | null | undefined>,
  ): {
    callCount?: number;
    totalCpuTime?: number;
    totalTime?: number;
    estimatedTimeToRegainAccess?: number;
  } | null;
}

const STORAGE_KEY_SNAPSHOT = "snapshot";

/**
 * Meta (Facebook/Instagram) rate limit parser.
 * Handles x-app-usage and x-business-use-case-usage headers.
 */
class MetaRateLimitParser implements RateLimitParser {
  parse(headers: Record<string, string | number | boolean | null | undefined>) {
    let callCount: number | undefined;
    let totalCpuTime: number | undefined;
    let totalTime: number | undefined;
    let estimatedTimeToRegainAccess: number | undefined;

    // x-app-usage: Instagram uses call_volume/cpu_time, Facebook uses call_count/total_cputime/total_time
    const appUsage = headers["x-app-usage"];
    if (typeof appUsage === "string") {
      try {
        const parsed = JSON.parse(appUsage) as Record<string, unknown>;
        callCount =
          this.parseInteger(parsed.call_count) ??
          this.parseInteger(parsed.call_volume);
        totalCpuTime =
          this.parseInteger(parsed.total_cputime) ??
          this.parseInteger(parsed.cpu_time);
        totalTime = this.parseInteger(parsed.total_time);
      } catch {
        // Ignore parse errors, will try business usage header
      }
    }

    // x-business-use-case-usage: Business-level rate limits
    const businessUsage = headers["x-business-use-case-usage"];
    if (typeof businessUsage === "string") {
      try {
        const parsed = JSON.parse(businessUsage) as Record<string, unknown>;
        const entries = Object.values(parsed);
        if (entries.length > 0 && Array.isArray(entries[0])) {
          const firstEntry = entries[0][0] as
            | Record<string, unknown>
            | undefined;
          if (firstEntry) {
            callCount ??= this.parseInteger(firstEntry.call_count);
            totalCpuTime ??= this.parseInteger(firstEntry.total_cputime);
            totalTime ??= this.parseInteger(firstEntry.total_time);
            estimatedTimeToRegainAccess = this.parseInteger(
              firstEntry.estimated_time_to_regain_access,
            );
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Only return if we found something
    if (
      callCount !== undefined ||
      totalCpuTime !== undefined ||
      totalTime !== undefined ||
      estimatedTimeToRegainAccess !== undefined
    ) {
      return {
        callCount,
        totalCpuTime,
        totalTime,
        estimatedTimeToRegainAccess,
      };
    }

    return null;
  }

  private parseInteger(value: unknown): number | undefined {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }
}

/**
 * Generic rate limit parser for platforms with standard headers.
 * Can be extended for platforms like Twitter, TikTok, LinkedIn, etc.
 */
class StandardRateLimitParser implements RateLimitParser {
  parse(headers: Record<string, string | number | boolean | null | undefined>) {
    let callCount: number | undefined;
    let estimatedTimeToRegainAccess: number | undefined;

    // X-RateLimit-* headers (common pattern used by Twitter, GitHub, etc.)
    const remaining = headers["x-ratelimit-remaining"];
    const limit = headers["x-ratelimit-limit"];
    const reset = headers["x-ratelimit-reset"];

    if (typeof limit === "string" && typeof remaining === "string") {
      const limitNum = Number.parseInt(limit, 10);
      const remainingNum = Number.parseInt(remaining, 10);
      if (Number.isFinite(limitNum) && Number.isFinite(remainingNum)) {
        callCount = limitNum - remainingNum;
      }
    }

    if (typeof reset === "string") {
      const resetNum = Number.parseInt(reset, 10);
      if (Number.isFinite(resetNum)) {
        const now = Math.floor(Date.now() / 1000);
        estimatedTimeToRegainAccess = Math.max(
          0,
          Math.floor((resetNum - now) / 60),
        );
      }
    }

    // Retry-After header (when rate limited)
    const retryAfter = headers["retry-after"];
    if (typeof retryAfter === "string") {
      const retrySeconds = Number.parseInt(retryAfter, 10);
      if (Number.isFinite(retrySeconds)) {
        estimatedTimeToRegainAccess = Math.ceil(retrySeconds / 60);
      }
    }

    if (callCount !== undefined || estimatedTimeToRegainAccess !== undefined) {
      return { callCount, estimatedTimeToRegainAccess };
    }

    return null;
  }
}

// Registry of parsers by platform identifier
const PARSERS: Record<string, RateLimitParser> = {
  meta: new MetaRateLimitParser(),
  FACEBOOK: new MetaRateLimitParser(),
  INSTAGRAM: new MetaRateLimitParser(),
  TIKTOK: new StandardRateLimitParser(), // TikTok uses standard rate limit headers
  standard: new StandardRateLimitParser(),
};

/**
 * Get the appropriate parser for a platform, or use all parsers in sequence.
 */
function getParsers(platform?: AllPlatforms): RateLimitParser[] {
  if (platform && PARSERS[platform]) {
    return [PARSERS[platform]];
  }
  // Try all parsers in order of likelihood
  return [PARSERS.meta, PARSERS.standard];
}

export class ApiRateLimitCoordinator extends DurableObject<ApiEnv> {
  private snapshot: RateLimitSnapshot | null = null;

  constructor(state: DurableObjectState, env: ApiEnv) {
    super(state, env);
  }

  protected get storage() {
    return this.ctx.storage;
  }

  public async reserve(_request: { cost: number }): Promise<ReserveResponse> {
    await this.loadSnapshot();
    const now = Date.now();
    const pausedUntil = this.snapshot?.pausedUntil ?? null;

    if (pausedUntil && now < pausedUntil) {
      return {
        allowed: false,
        waitUntil: pausedUntil,
        snapshot: this.requireSnapshot(),
      };
    }

    return {
      allowed: true,
      snapshot: this.requireSnapshot(),
    };
  }

  public async reportHeaders(
    request: ReportHeadersRequest,
  ): Promise<RateLimitSnapshot> {
    await this.loadSnapshot();

    const nextSnapshot = this.calculateSnapshot(request);
    this.snapshot = nextSnapshot;
    await this.storage.put(STORAGE_KEY_SNAPSHOT, nextSnapshot);

    return nextSnapshot;
  }

  async getStatus(): Promise<RateLimitSnapshot | null> {
    await this.loadSnapshot();
    return this.snapshot;
  }

  private async loadSnapshot() {
    if (this.snapshot !== null) return;
    const stored =
      await this.storage.get<RateLimitSnapshot>(STORAGE_KEY_SNAPSHOT);
    this.snapshot =
      stored ??
      ({
        lastUpdatedAt: 0,
        pausedUntil: null,
      } satisfies RateLimitSnapshot);
  }

  private calculateSnapshot(request: ReportHeadersRequest): RateLimitSnapshot {
    const { headers, timestamp, throttled, platform } = request;

    // Try platform-specific parsers
    const parsers = getParsers(platform);
    let callCount: number | undefined;
    let totalCpuTime: number | undefined;
    let totalTime: number | undefined;
    let estimatedTimeToRegainAccess: number | undefined;

    for (const parser of parsers) {
      const result = parser.parse(headers);
      if (result) {
        callCount ??= result.callCount;
        totalCpuTime ??= result.totalCpuTime;
        totalTime ??= result.totalTime;
        estimatedTimeToRegainAccess ??= result.estimatedTimeToRegainAccess;

        // If we got meaningful data, we can stop
        if (
          callCount !== undefined ||
          estimatedTimeToRegainAccess !== undefined
        ) {
          break;
        }
      }
    }

    const pausedUntil = this.computePausedUntil(
      timestamp,
      throttled,
      estimatedTimeToRegainAccess,
    );

    return {
      callCount,
      totalCpuTime,
      totalTime,
      estimatedTimeToRegainAccess,
      pausedUntil,
      headers,
      lastUpdatedAt: timestamp,
    } satisfies RateLimitSnapshot;
  }

  private computePausedUntil(
    timestamp: number,
    throttled: boolean | undefined,
    estimatedMinutes?: number,
  ): number | null {
    if (estimatedMinutes && estimatedMinutes > 0) {
      return timestamp + estimatedMinutes * 60 * 1000;
    }
    if (throttled) {
      return timestamp + 15 * 60 * 1000;
    }
    return null;
  }

  private requireSnapshot(): RateLimitSnapshot {
    if (!this.snapshot) {
      throw new Error("snapshot not loaded");
    }
    return this.snapshot;
  }
}
