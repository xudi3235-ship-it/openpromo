import type { ApiEnv } from "@core/helpers/api-env";
import { Binding } from "@core/helpers/api-env";

export type RateLimitHit = {
  rateLimitKey: string;
  waitUntil: number;
  waitMs: number;
  snapshot: RateLimitSnapshotSummary;
};

type RateLimitSnapshotSummary = {
  callCount?: number;
  totalCpuTime?: number;
  totalTime?: number;
  estimatedTimeToRegainAccess?: number;
};

export type RateLimitOptions = {
  cost?: number;
  onRateLimit?: (hit: RateLimitHit) => Promise<boolean> | boolean;
};

export type RateLimitStub = ReturnType<
  ApiEnv["Bindings"]["ApiRateLimitCoordinator"]["getByName"]
>;

export async function fetchWithRateLimit(
  rateLimitKey: string,
  request: () => Promise<Response>,
  options: RateLimitOptions = {},
): Promise<Response> {
  const { cost = 1, onRateLimit } = options;

  let stub: RateLimitStub;
  try {
    const bindings = Binding.use();
    stub = bindings.ApiRateLimitCoordinator.getByName(rateLimitKey);
  } catch (error) {
    console.warn("rate limit coordinator unavailable", {
      rateLimitKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return request();
  }

  try {
    const reservation = await stub.reserve({ cost });

    if (!reservation.allowed && reservation.waitUntil) {
      const waitMs = reservation.waitUntil - Date.now();
      const hit: RateLimitHit = {
        rateLimitKey,
        waitUntil: reservation.waitUntil,
        waitMs,
        snapshot: {
          callCount: reservation.snapshot.callCount,
          totalCpuTime: reservation.snapshot.totalCpuTime,
          totalTime: reservation.snapshot.totalTime,
          estimatedTimeToRegainAccess:
            reservation.snapshot.estimatedTimeToRegainAccess,
        },
      };

      const shouldWait = onRateLimit ? await onRateLimit(hit) : false;

      if (!shouldWait) {
        throw new Error(
          `Rate limit exceeded for ${rateLimitKey}. Retry after ${new Date(
            reservation.waitUntil,
          ).toISOString()}`,
        );
      }

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    const response = await request();

    await stub.reportHeaders({
      cost,
      timestamp: Date.now(),
      headers: headersToRecord(response.headers),
      throttled: !response.ok,
    });

    return response;
  } catch (error) {
    console.warn("rate-limited fetch failed", {
      rateLimitKey,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    record[key.toLowerCase()] = value;
  }
  return record;
}
