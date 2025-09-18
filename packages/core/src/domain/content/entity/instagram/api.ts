import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { IGFeedPlacementSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";

const log = Log.create({ namespace: "instagram-api" });

export interface InstagramIdentityContext {
  igAccountID: string;
  accessToken: string;
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
  } satisfies InstagramIdentityContext;
}

export interface GraphRequestOptions {
  method?: HttpMethod;
  searchParams?: Record<string, string | undefined>;
  body?: Record<string, unknown> | null;
}

export async function instagramGraphRequest<T = unknown>(
  ctx: InstagramIdentityContext,
  path: string,
  options: GraphRequestOptions = {},
): Promise<T> {
  const { method = "GET", searchParams = {}, body = null } = options;

  const url = new URL(`https://graph.instagram.com/v23.0${path}`);
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

  log.info("instagram graph request", {
    path,
    method,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const text = await response.text();
    log.warn("instagram graph request failed", {
      path,
      method,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    throw new Error(
      `instagram graph request failed (${path}): ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}
