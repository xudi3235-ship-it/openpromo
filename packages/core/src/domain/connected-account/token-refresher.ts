import { db, eq } from "@core/database/db";
import {
  type ConnectedAccountSelect,
  connectedAccount,
} from "@core/schemas/connected-account.sql";
import { Log } from "@core/utils/log";
import {
  AllPlatforms,
  type AllPlatforms as PlatformValue,
} from "@shared/content";
import { and } from "drizzle-orm";
import { facebookOAuthService } from "./facebook-oauth-service";
import { instagramOAuthService } from "./instragram-oauth-service";
import { tikTokBusinessOAuthService } from "./tiktok-business-oauth-service";
import { tikTokOAuthService } from "./tiktok-oauth-service";

const log = Log.create({ namespace: "connected-account.token-refresher" });

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FB_IG_EXPIRY_SECONDS = 60 * 24 * 60 * 60; // 60 days
const DEFAULT_TIKTOK_EXPIRY_SECONDS = 24 * 60 * 60; // 1 day fallback

const PLATFORM_REFRESH_THRESHOLDS: Record<PlatformValue, number> = {
  [AllPlatforms.FACEBOOK]: 14 * DAY_MS,
  [AllPlatforms.INSTAGRAM]: 14 * DAY_MS,
  [AllPlatforms.TIKTOK]: 7 * DAY_MS,
};

export interface WorkspaceTokenRefreshResult {
  processed: number;
  refreshed: number;
  skipped: number;
  failures: Array<{ connectedAccountId: string; reason: string }>;
}

export async function refreshWorkspaceTokens(
  workspaceId: string,
): Promise<WorkspaceTokenRefreshResult> {
  const accounts = await db()
    .select()
    .from(connectedAccount)
    .where(eq(connectedAccount.workspaceId, workspaceId));

  if (accounts.length === 0) {
    log.info("no connected accounts for workspace", { workspaceId });
    return { processed: 0, refreshed: 0, skipped: 0, failures: [] };
  }

  const now = Date.now();
  let refreshed = 0;
  let skipped = 0;
  const failures: WorkspaceTokenRefreshResult["failures"] = [];

  for (const account of accounts) {
    const threshold = PLATFORM_REFRESH_THRESHOLDS[account.platform];
    const expiresAt = account.tokenExpiresAt?.getTime();
    const needsRefresh =
      !expiresAt || (threshold ? expiresAt <= now + threshold : false);

    if (!needsRefresh) {
      skipped += 1;
      continue;
    }

    try {
      const updated = await refreshAccountToken(account);
      if (updated) {
        refreshed += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failures.push({
        connectedAccountId: account.id,
        reason:
          error instanceof Error ? error.message : String(error ?? "unknown"),
      });
      log.warn("token refresh failed", {
        workspaceId,
        connectedAccountId: account.id,
        platform: account.platform,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      });
    }
  }

  return {
    processed: accounts.length,
    refreshed,
    skipped,
    failures,
  };
}

async function refreshAccountToken(account: ConnectedAccountSelect) {
  switch (account.platform) {
    case AllPlatforms.FACEBOOK:
      return refreshFacebookAccount(account);
    case AllPlatforms.INSTAGRAM:
      return refreshInstagramAccount(account);
    case AllPlatforms.TIKTOK:
      return refreshTikTokAccount(account);
    default:
      return false;
  }
}

async function refreshFacebookAccount(account: ConnectedAccountSelect) {
  if (!account.encryptedAccessToken) {
    return false;
  }

  const response = await facebookOAuthService.exchangeForLongLivedToken(
    account.encryptedAccessToken,
  );

  const expiresInSeconds = response.expires_in ?? DEFAULT_FB_IG_EXPIRY_SECONDS;

  await persistTokenUpdate(account, {
    encryptedAccessToken: response.access_token,
    refreshToken: response.access_token,
    tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  });

  return true;
}

async function refreshInstagramAccount(account: ConnectedAccountSelect) {
  if (!account.encryptedAccessToken) {
    return false;
  }

  const response = await instagramOAuthService.refreshAccessToken(
    account.encryptedAccessToken,
  );

  const expiresInSeconds = response.expires_in ?? DEFAULT_FB_IG_EXPIRY_SECONDS;

  await persistTokenUpdate(account, {
    encryptedAccessToken: response.access_token,
    refreshToken: response.access_token,
    tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  });

  return true;
}

async function refreshTikTokAccount(account: ConnectedAccountSelect) {
  if (!account.refreshToken) {
    throw new Error("refresh token missing for TikTok account");
  }

  const response =
    account.tiktokAuthType === "BUSINESS_LOGIN"
      ? await tikTokBusinessOAuthService.refreshAccessToken(
          account.refreshToken,
        )
      : await tikTokOAuthService.refreshAccessToken(account.refreshToken);

  const expiresInSeconds = response.expires_in ?? DEFAULT_TIKTOK_EXPIRY_SECONDS;
  const refreshToken = response.refresh_token || account.refreshToken;

  await persistTokenUpdate(account, {
    encryptedAccessToken: response.access_token,
    refreshToken,
    tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  });

  return true;
}

async function persistTokenUpdate(
  account: ConnectedAccountSelect,
  updates: {
    encryptedAccessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  },
) {
  await db()
    .update(connectedAccount)
    .set({
      encryptedAccessToken: updates.encryptedAccessToken,
      refreshToken: updates.refreshToken,
      tokenExpiresAt: updates.tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(connectedAccount.id, account.id),
        eq(connectedAccount.workspaceId, account.workspaceId),
      ),
    );
}
