import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import {
  fetchWithRateLimit,
  type RateLimitOptions,
} from "@core/domain/content/platform-rate-limit";
import type { IGFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import { AllPlatforms } from "@shared/content";
import { FacebookGraphError, facebookGraphErrorSchema } from "../facebook/api";

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";

const log = Log.create({ namespace: "instagram-api" });

export interface InstagramIdentityContext {
  igAccountID: string;
  accessToken: string;
  rateLimitKey: string;
}

export async function resolveInstagramIdentity(
  placementSpec: IGFeedPlacementSpec,
): Promise<InstagramIdentityContext> {
  const igAccountID = placementSpec.identity.igAccountID;
  if (!igAccountID) {
    throw new Error("instagram placement spec missing igAccountID");
  }

  const account = await ConnectedAccount.fromIGAccountID(igAccountID);
  if (!account) {
    throw new Error(
      `connected account not found for ig account ${igAccountID}`,
    );
  }

  return {
    igAccountID,
    accessToken: account.encryptedAccessToken,
    rateLimitKey: `instagram:${account.id}`,
  } satisfies InstagramIdentityContext;
}

export interface GraphRequestOptions {
  method?: HttpMethod;
  searchParams?: Record<string, string | undefined>;
  body?: Record<string, unknown> | null;
  apiVersion?: string;
  host?: "graph.instagram.com" | "graph.facebook.com";
  onRateLimit?: RateLimitOptions["onRateLimit"];
}

export async function instagramGraphRequest<T = unknown>(
  ctx: { accessToken: string; rateLimitKey: string },
  path: string,
  options: GraphRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    searchParams = {},
    body = null,
    apiVersion,
    host,
  } = options;

  const baseHost = host ?? "graph.instagram.com";
  const version = apiVersion ?? "v24.0";

  const url = new URL(`https://${baseHost}/${version}${path}`);
  url.searchParams.set("access_token", ctx.accessToken);
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value !== "undefined") {
      url.searchParams.set(key, value);
    }
  }

  // Create request body string for logging
  const requestBodyString = body ? JSON.stringify(body, null, 2) : null;

  // Create sanitized URL for logging (hide access_token)
  const sanitizedUrl = new URL(url.toString());
  sanitizedUrl.searchParams.set("access_token", "***REDACTED***");

  // Log full request details before sending
  log.info("instagram graph request - full request details", {
    method,
    path,
    url: sanitizedUrl.toString(),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ***REDACTED***`,
    },
    body: requestBodyString,
    bodySize: requestBodyString?.length ?? 0,
  });

  const response = await fetchWithRateLimit(
    ctx.rateLimitKey,
    () =>
      fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    {
      platform: AllPlatforms.INSTAGRAM,
      onRateLimit: options.onRateLimit,
    },
  );

  log.info("instagram graph request - response received", {
    url: sanitizedUrl.toString(),
    method,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const errorResponseText = await response.text();
    let errorResponse: unknown;
    try {
      errorResponse = JSON.parse(errorResponseText);
    } catch {
      errorResponse = errorResponseText;
    }

    const error = facebookGraphErrorSchema.parse(errorResponse);

    // Log full error details
    log.warn("instagram graph request failed - full error details", {
      path,
      method,
      requestUrl: sanitizedUrl.toString(),
      requestBody: requestBodyString,
      status: response.status,
      statusText: response.statusText,
      errorResponse:
        typeof errorResponse === "string"
          ? errorResponse
          : JSON.stringify(errorResponse, null, 2),
      errorCode: error.error.code,
      errorType: error.error.type,
      errorMessage: error.error.message,
    });

    const graphError = new FacebookGraphError(
      error.error.message ?? response.statusText,
      error.error.code,
      error.error.type,
    );

    log.error(graphError);
    throw graphError;
  }

  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as T;
  }
}
