import { db, eq } from "@core/database/db";
import { writeInsightAnalytics } from "@core/domain/insights/analytics-engine";
import {
  type ConnectedAccountSelect,
  connectedAccount,
} from "@core/schemas/connected-account.sql";
import { connectedAccountMetricsSnapshotTable } from "@core/schemas/connected-account-metrics.sql";
import { Log } from "@core/utils/log";
import { AllPlatforms } from "@shared/content";
import type { FacebookPage } from "./facebook-oauth-service";

type ProviderResult = {
  followersCount?: number | null;
  followingCount?: number | null;
  collectedAt?: Date;
  metadata?: Record<string, unknown>;
};

type RefreshFailure = {
  connectedAccountId: string;
  reason: string;
};

type RefreshResult = {
  processed: number;
  updated: number;
  failures: RefreshFailure[];
};

interface ConnectedAccountMetricsProvider {
  supports(account: ConnectedAccountSelect): boolean;
  fetch(account: ConnectedAccountSelect): Promise<ProviderResult | null>;
}

class FacebookMetricsProvider implements ConnectedAccountMetricsProvider {
  private readonly baseUrl = "https://graph.facebook.com/v24.0";
  private readonly log = Log.create({
    namespace: "connected-account.metrics.facebook",
  });

  supports(account: ConnectedAccountSelect): boolean {
    return account.platform === AllPlatforms.FACEBOOK;
  }

  async fetch(account: ConnectedAccountSelect): Promise<ProviderResult | null> {
    if (!account.encryptedAccessToken) {
      this.log.warn("missing page access token", { accountId: account.id });
      return null;
    }

    const url = new URL(`/${account.externalAccountId}`, this.baseUrl);
    url.searchParams.set("fields", "followers_count,fan_count,name,username");
    url.searchParams.set("access_token", account.encryptedAccessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      this.log.warn("failed to fetch facebook page metrics", {
        accountId: account.id,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const body = (await response.json()) as FacebookPage & {
      followers_count?: number;
      fan_count?: number;
    };

    const followers =
      typeof body.followers_count === "number"
        ? body.followers_count
        : typeof body.fan_count === "number"
          ? body.fan_count
          : null;

    return {
      followersCount: followers,
      collectedAt: new Date(),
      metadata: {
        source: "facebook_graph_api",
        followers_count: body.followers_count,
        fan_count: body.fan_count,
      },
    };
  }
}

class InstagramMetricsProvider implements ConnectedAccountMetricsProvider {
  private readonly baseUrl = "https://graph.facebook.com/v24.0";
  private readonly log = Log.create({
    namespace: "connected-account.metrics.instagram",
  });

  supports(account: ConnectedAccountSelect): boolean {
    return account.platform === AllPlatforms.INSTAGRAM;
  }

  async fetch(account: ConnectedAccountSelect): Promise<ProviderResult | null> {
    if (!account.encryptedAccessToken) {
      this.log.warn("missing instagram access token", {
        accountId: account.id,
      });
      return null;
    }

    const url = new URL(`/${account.externalAccountId}`, this.baseUrl);
    url.searchParams.set("fields", "followers_count,follows_count,username");
    url.searchParams.set("access_token", account.encryptedAccessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      this.log.warn("failed to fetch instagram metrics", {
        accountId: account.id,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const body = (await response.json()) as {
      followers_count?: number;
      follows_count?: number;
      username?: string;
    };

    return {
      followersCount:
        typeof body.followers_count === "number" ? body.followers_count : null,
      followingCount:
        typeof body.follows_count === "number" ? body.follows_count : null,
      collectedAt: new Date(),
      metadata: {
        source: "instagram_graph_api",
        username: body.username,
      },
    };
  }
}

class TikTokMetricsProvider implements ConnectedAccountMetricsProvider {
  private readonly log = Log.create({
    namespace: "connected-account.metrics.tiktok",
  });

  private readonly endpoint = "https://open.tiktokapis.com/v2/user/info/";

  supports(account: ConnectedAccountSelect): boolean {
    return account.platform === AllPlatforms.TIKTOK;
  }

  async fetch(account: ConnectedAccountSelect): Promise<ProviderResult | null> {
    if (!account.encryptedAccessToken) {
      this.log.warn("missing tiktok access token", { accountId: account.id });
      return null;
    }

    const url = new URL(this.endpoint);
    url.searchParams.set(
      "fields",
      "open_id,username,display_name,follower_count,following_count",
    );

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${account.encryptedAccessToken}`,
      },
    });

    if (!response.ok) {
      this.log.warn("failed to fetch tiktok metrics", {
        accountId: account.id,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const body = (await response.json()) as {
      data?: {
        user?: {
          follower_count?: number;
          following_count?: number;
          username?: string;
          display_name?: string;
        };
      };
      error?: { code: string; message: string };
    };

    const user = body.data?.user;
    if (!user) {
      this.log.warn("tiktok metrics response missing user", {
        accountId: account.id,
        body: JSON.stringify(body),
      });
      return null;
    }

    return {
      followersCount:
        typeof user.follower_count === "number" ? user.follower_count : null,
      followingCount:
        typeof user.following_count === "number" ? user.following_count : null,
      collectedAt: new Date(),
      metadata: {
        source: "tiktok_api",
        username: user.username,
        displayName: user.display_name,
      },
    };
  }
}

export class ConnectedAccountRefresher {
  private readonly providers: ConnectedAccountMetricsProvider[];
  private readonly log = Log.create({
    namespace: "connected-account.metrics.refresher",
  });

  constructor(providers?: ConnectedAccountMetricsProvider[]) {
    this.providers = providers ?? [
      new FacebookMetricsProvider(),
      new InstagramMetricsProvider(),
      new TikTokMetricsProvider(),
    ];
  }

  async refreshWorkspace(workspaceId: string): Promise<RefreshResult> {
    const accounts = await db()
      .select()
      .from(connectedAccount)
      .where(eq(connectedAccount.workspaceId, workspaceId));

    return this.refreshAccounts(accounts);
  }

  async refreshAccount(
    account: ConnectedAccountSelect,
  ): Promise<RefreshResult> {
    return this.refreshAccounts([account]);
  }

  private async refreshAccounts(
    accounts: ConnectedAccountSelect[],
  ): Promise<RefreshResult> {
    if (accounts.length === 0) {
      return { processed: 0, updated: 0, failures: [] };
    }

    const failures: RefreshFailure[] = [];
    let updated = 0;

    for (const account of accounts) {
      const provider = this.providers.find((candidate) =>
        candidate.supports(account),
      );

      if (!provider) {
        failures.push({
          connectedAccountId: account.id,
          reason: `no provider registered for platform ${account.platform}`,
        });
        continue;
      }

      try {
        const result = await provider.fetch(account);
        if (!result) continue;

        const collectedAt = result.collectedAt ?? new Date();

        await db()
          .insert(connectedAccountMetricsSnapshotTable)
          .values({
            workspaceId: account.workspaceId,
            connectedAccountId: account.id,
            platform: account.platform,
            collectedAt,
            followersCount:
              typeof result.followersCount === "number"
                ? result.followersCount
                : null,
            followingCount:
              typeof result.followingCount === "number"
                ? result.followingCount
                : null,
            metadata: result.metadata ?? {},
          })
          .execute();

        const resolvedFollowers =
          typeof result.followersCount === "number"
            ? Math.max(0, result.followersCount)
            : (account.followersCount ?? 0);

        const resolvedFollowing =
          typeof result.followingCount === "number"
            ? Math.max(0, result.followingCount)
            : (account.followingCount ?? 0);

        await db()
          .update(connectedAccount)
          .set({
            followersCount: resolvedFollowers,
            followingCount: resolvedFollowing,
            metricsRefreshedAt: collectedAt,
          })
          .where(eq(connectedAccount.id, account.id));

        if (
          typeof result.followersCount === "number" &&
          result.followersCount >= 0
        ) {
          await writeInsightAnalytics([
            {
              workspaceId: account.workspaceId,
              domain: "audience",
              entityType: "connected_account",
              entityId: account.id,
              collectedAt,
              metrics: { followers: result.followersCount },
              dimensions: {
                platform: account.platform,
                external_account_id: account.externalAccountId,
              },
            },
          ]);
        }

        updated += 1;
      } catch (error) {
        this.log.warn("failed to refresh connected account metrics", {
          accountId: account.id,
          platform: account.platform,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : String(error),
        });
        failures.push({
          connectedAccountId: account.id,
          reason:
            error instanceof Error
              ? error.message
              : String(error ?? "unknown error"),
        });
      }
    }

    return {
      processed: accounts.length,
      updated,
      failures,
    };
  }
}

export const connectedAccountRefresher = new ConnectedAccountRefresher();
