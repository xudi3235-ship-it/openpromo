import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { FBFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import * as z from "zod";

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";

const log = Log.create({ namespace: "facebook-api" });

export interface FacebookIdentityContext {
  pageID: string;
  accessToken: string;
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
  } satisfies FacebookIdentityContext;
}

export interface GraphRequestOptions {
  method?: HttpMethod;
  searchParams?: Record<string, string | undefined>;
  body?: Record<string, unknown> | URLSearchParams | FormData | string | null;
  apiVersion?: string;
  headers?: Record<string, string>;
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

export async function facebookGraphRequest<T = unknown>(
  ctx: { accessToken: string },
  path: string,
  options: GraphRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    searchParams = {},
    body = null,
    apiVersion,
    headers: customHeaders = {},
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

  const response = await fetch(url.toString(), fetchOptions);

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
