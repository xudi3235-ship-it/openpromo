import { randomUUID } from "node:crypto";
import { db } from "@core/helpers/db";
import { Storage } from "@core/helpers/storage";
import {
  type ConnectedAccountSelect,
  ConnectedAccountSelectSchema,
  type ConnectedAccountWithoutSensitive,
  connectedAccount,
} from "@core/schemas/connected-account.sql";
import { fn } from "@core/utils/fn";
import { Log } from "@core/utils/log";
import { and, eq, getTableColumns } from "drizzle-orm";
import z from "zod";
import { Actor } from "../../helpers/actor";
import { facebookOAuthService } from "./facebook";
import { instagramOAuthService } from "./instagram";
import { tikTokOAuthService } from "./tiktok";

const log = Log.create({ namespace: "connected-account" });

export namespace ConnectedAccount {
  const inAWeek = Date.now() + 7 * 24 * 3600 * 1000;
  const sixtyDaysInSec = 60 * 24 * 3600;
  export const Info = ConnectedAccountSelectSchema;

  export const Event = {
    // TODO: define events, setup event bus handling.
  };

  // link a new connected account
  export const create = fn(
    Info.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      workspaceId: true,
    }),
    async (input) => {
      const workspaceId = Actor.workspaceID();
      const {
        profilePicUrl: rawProfilePicUrl,
        metadata: rawMetadata,
        ...restInput
      } = input;

      const profilePicUrl = await mirrorProfilePictureToR2(rawProfilePicUrl, {
        workspaceId,
        platform: restInput.platform,
        externalAccountId: restInput.externalAccountId,
      });

      const metadata = {
        ...(rawMetadata ?? {}),
        profilePicUrl,
      } satisfies Record<string, unknown>;

      const [acc] = await db()
        .insert(connectedAccount)
        .values({
          workspaceId,
          ...restInput,
          profilePicUrl,
          metadata,
        })
        .onConflictDoUpdate({
          target: [
            connectedAccount.workspaceId,
            connectedAccount.externalAccountId,
          ],
          set: {
            accountName: input.accountName,
            externalUrl: input.externalUrl,
            encryptedAccessToken: input.encryptedAccessToken,
            refreshToken: input.refreshToken,
            tokenExpiresAt: input.tokenExpiresAt,
            metadata,
            profilePicUrl,
          },
        })
        .returning();

      return acc;
    },
  );

  function withoutSensitive() {
    const {
      encryptedAccessToken: _,
      refreshToken: __,
      ...rest
    } = getTableColumns(connectedAccount);
    return rest;
  }

  export async function list(): Promise<ConnectedAccountWithoutSensitive[]> {
    const workspaceId = Actor.workspaceID();
    const accounts = await db()
      .select(withoutSensitive())
      .from(connectedAccount)
      .where(eq(connectedAccount.workspaceId, workspaceId));
    return accounts;
  }
  export async function deleteById(id: string): Promise<void> {
    const workspaceId = Actor.workspaceID();
    await db()
      .delete(connectedAccount)
      .where(
        and(
          eq(connectedAccount.id, id),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .execute();
  }
  export async function fromID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.id, id),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      );
    if (!acc) throw new Error("connected account not found");
    return acc;
  }
  export async function fromFBPageID(
    id: string,
    options: { skipWorkspaceCheck?: boolean } = {},
  ) {
    const workspaceId = options.skipWorkspaceCheck
      ? undefined
      : Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "FACEBOOK"),
          workspaceId
            ? eq(connectedAccount.workspaceId, workspaceId)
            : undefined,
        ),
      )
      .limit(1);
    if (!acc) throw new Error("connected account not found");

    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }
    // if about to expire, refresh it
    const newToken = await facebookOAuthService.exchangeForLongLivedToken(
      acc.encryptedAccessToken,
    );

    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );
    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken: newToken.access_token,
      tokenExpiresAt,
    });
    return newAcc;
  }
  export async function fromIGAccountID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "INSTAGRAM"),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!acc) throw new Error("connected account not found");
    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }
    // refresh it if about to expire
    const newToken = await instagramOAuthService.refreshAccessToken(
      acc.encryptedAccessToken,
    );
    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );
    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken: newToken.access_token,
      tokenExpiresAt,
    });
    return newAcc;
  }
  export async function fromTikTokAccountID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "TIKTOK"),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!acc) throw new Error("connected account not found");

    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }

    if (!acc.refreshToken) {
      return acc;
    }

    const newToken = await tikTokOAuthService.refreshAccessToken(
      acc.refreshToken,
    );

    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );

    const refreshToken = newToken.refresh_token || acc.refreshToken;

    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken,
      tokenExpiresAt,
    });

    return newAcc;
  }
  const updateAccessToken = fn(
    z.object({
      id: z.string(),
      encryptedAccessToken: z.string(),
      refreshToken: z.string(),
      tokenExpiresAt: z.date(),
    }),
    async ({ id, ...rest }) => {
      const workspaceId = Actor.workspaceID();
      const [acc] = await db()
        .update(connectedAccount)
        .set(rest)
        .where(
          and(
            eq(connectedAccount.id, id),
            eq(connectedAccount.workspaceId, workspaceId),
          ),
        )
        .returning();
      if (!acc) throw new Error("connected account not found");
      return acc;
    },
  );
  // ------------------------------ internal ------------------------------
  export async function _createDummy(): Promise<ConnectedAccountSelect> {
    const accountName = `[Internal] dummy account`;
    // check if exists
    const workspaceId = Actor.workspaceID();
    const existing = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.workspaceId, workspaceId),
          eq(connectedAccount.accountName, accountName),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    return await ConnectedAccount.create({
      platform: "FACEBOOK",
      externalAccountId: "dummy",
      accountName,
      externalUrl: "https://facebook.com/dummy",
      encryptedAccessToken: "dummy-token",
      refreshToken: "dummy-refresh",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      metadata: {
        pageID: "dummy",
        pageName: "dummy",
        permissions: ["pages_show_list", "pages_read_engagement"],
        profilePicUrl: "",
        user: {
          accessToken: "dummy",
        },
      },
      profilePicUrl: null,
      lastBackfillAt: null,
    });
  }
}

async function mirrorProfilePictureToR2(
  url: string | null | undefined,
  context: {
    workspaceId: string;
    platform: ConnectedAccountSelect["platform"];
    externalAccountId: string;
  },
): Promise<string> {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.endsWith("bucket.openpromo.app")) {
      return trimmed;
    }
  } catch (_error) {
    log.warn("invalid profile picture url", {
      url: trimmed,
      context,
    });
    return "";
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok || !response.body) {
      throw new Error(
        `fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";
    const extension = extensionFromContentType(contentType);

    const key = Storage.Key.workspace(
      context.workspaceId,
      "connected-accounts",
      `${context.platform.toLowerCase()}-${context.externalAccountId}-${randomUUID()}.${extension}`,
    );

    await Storage.upload(
      key,
      response.body as ReadableStream<Uint8Array>,
      Storage.PUBLIC_BUCKET,
      {
        contentType,
        metadata: {
          workspaceId: context.workspaceId,
          platform: context.platform,
          externalAccountId: context.externalAccountId,
          source: trimmed,
        },
      },
    );

    return Storage.publicUrl(key, Storage.PUBLIC_BUCKET);
  } catch (error) {
    log.warn("failed to mirror profile picture", {
      error: (error as Error).message,
      sourceUrl: trimmed,
      context,
    });
    return trimmed;
  }
}

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };

  const normalized = contentType.toLowerCase();
  if (map[normalized]) return map[normalized];

  const [, subtype] = normalized.split("/");
  if (subtype && subtype.length <= 5) {
    return subtype.replace(/[^a-z0-9]/g, "") || "jpg";
  }
  return "jpg";
}
