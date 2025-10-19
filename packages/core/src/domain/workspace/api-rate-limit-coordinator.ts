import { DurableObject } from "cloudflare:workers";
import type { ApiEnv } from "@core/helpers/api-env";
import { Log } from "@core/utils/log";

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
};

const STORAGE_KEY_SNAPSHOT = "snapshot";

export class ApiRateLimitCoordinator extends DurableObject<ApiEnv> {
  private snapshot: RateLimitSnapshot | null = null;
  private readonly log = Log.create({ namespace: "rate-limit" });

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
    const { headers, timestamp, throttled } = request;

    let callCount: number | undefined;
    let totalCpuTime: number | undefined;
    let totalTime: number | undefined;
    let estimatedTimeToRegainAccess: number | undefined;

    const appUsage = headers["x-app-usage"];
    if (typeof appUsage === "string") {
      try {
        const parsed = JSON.parse(appUsage) as Record<string, unknown>;
        callCount = this.parseInteger(parsed["call_count"]);
        totalCpuTime = this.parseInteger(parsed["total_cputime"]);
        totalTime = this.parseInteger(parsed["total_time"]);
      } catch (error) {
        this.log.warn("failed to parse x-app-usage header", {
          error: (error as Error).message,
        });
      }
    }

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
            callCount ??= this.parseInteger(firstEntry["call_count"]);
            totalCpuTime ??= this.parseInteger(firstEntry["total_cputime"]);
            totalTime ??= this.parseInteger(firstEntry["total_time"]);
            estimatedTimeToRegainAccess = this.parseInteger(
              firstEntry["estimated_time_to_regain_access"],
            );
          }
        }
      } catch (error) {
        this.log.warn("failed to parse x-business-use-case-usage header", {
          error: (error as Error).message,
        });
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

  private requireSnapshot(): RateLimitSnapshot {
    if (!this.snapshot) {
      throw new Error("snapshot not loaded");
    }
    return this.snapshot;
  }
}
