import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { Binding } from "@core/helpers/api-env";
import type { FBFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import * as z from "zod";

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";

const log = Log.create({ namespace: "facebook-api" });

export interface FacebookIdentityContext {
  pageID: string;
  accessToken: string;
  rateLimitKey: string;
}

export async function resolveFacebookIdentity(
  placementSpec: FBFeedPlacementSpec,
): Promise<FacebookIdentityContext> {
  const pageID = placementSpec.identity.fbPageID;
  if (!pageID) {
    throw new Error("facebook placement spec missing fbPageID");
  }

  const account = await ConnectedAccount.fromFBPageID(pageID);
  if (!account) {
    throw new Error(`connected account not found for fb page ${pageID}`);
  }

  return {
    pageID,
    accessToken: account.encryptedAccessToken,
    rateLimitKey: `facebook:${account.id}`,
  } satisfies FacebookIdentityContext;
}

export interface GraphRequestOptions {
  method?: HttpMethod;
  searchParams?: Record<string, string | undefined>;
  body?: Record<string, unknown> | URLSearchParams | FormData | string | null;
  apiVersion?: string;
  headers?: Record<string, string>;
  /**
   * Called when rate limit is hit. Return true to wait and retry, false to throw error.
   * If not provided, will wait automatically.
   */
  onRateLimit?: (params: {
    rateLimitKey: string;
    waitUntil: number;
    waitMs: number;
    snapshot: {
      callCount?: number;
      totalCpuTime?: number;
      totalTime?: number;
      estimatedTimeToRegainAccess?: number;
    };
  }) => Promise<boolean> | boolean;
}

export const facebookGraphErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    type: z.string().optional(),
    code: z.number().optional(),
  }),
});

export class FacebookGraphError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly type?: string,
  ) {
    super(message);
    this.name = "FacebookGraphError";
  }
}

interface RateLimitedFetchOptions {
  /**
   * Called when rate limit is hit. Return true to wait and retry, false to throw error.
   * If not provided, will wait automatically.
   */
  onRateLimit?: (params: {
    rateLimitKey: string;
    waitUntil: number;
    waitMs: number;
    snapshot: {
      callCount?: number;
      totalCpuTime?: number;
      totalTime?: number;
      estimatedTimeToRegainAccess?: number;
    };
  }) => Promise<boolean> | boolean;
}

async function rateLimitedFetch(
  rateLimitKey: string,
  url: string,
  options: RequestInit,
  rateLimitOptions?: RateLimitedFetchOptions,
): Promise<Response> {
  const rateLimitStub =
    Binding.use().ApiRateLimitCoordinator.getByName(rateLimitKey);

  const reservation = await rateLimitStub.reserve({ cost: 1 });

  if (!reservation.allowed && reservation.waitUntil) {
    const waitMs = reservation.waitUntil - Date.now();

    if (waitMs > 0) {
      const shouldWait = rateLimitOptions?.onRateLimit
        ? await rateLimitOptions.onRateLimit({
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
          })
        : false; // Default: don't wait, just throw.

      if (!shouldWait) {
        throw new Error(
          `Rate limit exceeded for ${rateLimitKey}. Retry after ${new Date(reservation.waitUntil).toISOString()}`,
        );
      }

      log.info("rate limit hit, waiting before request", {
        rateLimitKey,
        waitMs,
        waitUntil: new Date(reservation.waitUntil).toISOString(),
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const response = await fetch(url, options);

  await rateLimitStub.reportHeaders({
    cost: 1,
    timestamp: Date.now(),
    headers: headersToRecord(response.headers),
    throttled: !response.ok,
  });

  return response;
}

export async function facebookGraphRequest<T = unknown>(
  ctx: { accessToken: string; rateLimitKey: string },
  path: string,
  options: GraphRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    searchParams = {},
    body = null,
    apiVersion,
    headers: customHeaders = {},
    onRateLimit,
  } = options;

  const version = apiVersion ?? "v23.0";
  const url = new URL(`https://graph.facebook.com/${version}${path}`);
  url.searchParams.set("access_token", ctx.accessToken);
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value !== "undefined") {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = { ...customHeaders };

  let requestBody: BodyInit | undefined;
  if (body !== null && typeof body !== "undefined") {
    if (
      typeof body === "object" &&
      typeof FormData !== "undefined" &&
      body instanceof FormData
    ) {
      requestBody = body;
    } else if (body instanceof URLSearchParams) {
      requestBody = body;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    } else if (typeof body === "string") {
      requestBody = body;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "text/plain";
      }
    } else {
      requestBody = JSON.stringify(body);
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const fetchOptions: RequestInit = {
    method,
  };

  if (Object.keys(headers).length > 0) {
    fetchOptions.headers = headers;
  }

  if (typeof requestBody !== "undefined") {
    fetchOptions.body = requestBody;
  }

  const response = await rateLimitedFetch(
    ctx.rateLimitKey,
    url.toString(),
    fetchOptions,
    { onRateLimit },
  );

  console.log("// Facebook Graph API response", {
    url: url.toString(),
    method,
    status: response.status,
    statusText: response.statusText,
  });
  if (!response.ok) {
    const error = facebookGraphErrorSchema.parse(await response.json());
    log.warn("facebook graph request failed", {
      path,
      method,
      status: response.status,
      statusText: response.statusText,
      body: JSON.stringify(error),
    });
    throw new FacebookGraphError(
      error.error.message ?? response.statusText,
      error.error.code,
      error.error.type,
    );
  }

  return (await response.json()) as T;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    record[key.toLowerCase()] = value;
  }
  return record;
}
