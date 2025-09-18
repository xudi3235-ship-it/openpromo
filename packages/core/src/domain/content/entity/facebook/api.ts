import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { FBFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

type HttpMethod = "GET" | "POST" | "DELETE";

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
  body?: Record<string, unknown> | null;
}

export async function facebookGraphRequest<T = unknown>(
  ctx: FacebookIdentityContext,
  path: string,
  options: GraphRequestOptions = {},
): Promise<T> {
  const { method = "GET", searchParams = {}, body = null } = options;

  const url = new URL(`https://graph.facebook.com/v23.0${path}`);
  url.searchParams.set("access_token", ctx.accessToken);
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value !== "undefined") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log("// Facebook Graph API response", {
    url: url.toString(),
    method,
    status: response.status,
    statusText: response.statusText,
  });
  if (!response.ok) {
    const text = await response.text();
    log.warn("facebook graph request failed", {
      path,
      method,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    throw new Error(
      `facebook graph request failed (${path}): ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}
