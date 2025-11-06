import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";

interface TikTokBusinessTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  open_id: string;
  scope?: string;
  token_type?: string;
}

interface TikTokBusinessTokenResponse {
  code?: number;
  message?: string;
  request_id?: string;
  data?: TikTokBusinessTokenData;
}

interface TikTokBusinessUserData {
  display_name?: string;
  username?: string;
  profile_image?: string;
  profile_deep_link?: string;
  bio_description?: string;
  is_verified?: boolean;
  is_business_account?: boolean;
  followers_count?: number;
  following_count?: number;
  total_likes?: number;
  videos_count?: number;
}

interface TikTokBusinessUserInfoResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: TikTokBusinessUserData;
}

export interface TikTokBusinessAuthTokenDetails {
  refreshToken: string;
  refreshTokenExpiresIn?: number;
  expiresIn: number;
  accessToken: string;
  id: string;
  name: string;
  username?: string;
  permissions: string[];
  picture: string;
  unionId?: string;
  followerCount?: number;
  followingCount?: number;
}

type TikTokWebhookEventType = "VIDEO" | "COMMENT";

interface TikTokWebhookResponse {
  code: number;
  message?: string;
  request_id?: string;
  data?: unknown;
}

const log = Log.create({ namespace: "TikTokBusinessOAuthService" });

function ensureBusinessTokenData(
  json: TikTokBusinessTokenResponse,
  context: string,
): TikTokBusinessTokenData {
  const responseCode = typeof json.code === "number" ? json.code : -1;

  // TikTok Business API returns code: 0 for success
  if (responseCode !== 0) {
    const description = json.message || `error code ${responseCode}`;
    throw new Error(`TikTok Business OAuth ${context} error: ${description}`);
  }

  if (!json.data) {
    log.warn("TikTok Business OAuth unexpected response", {
      context,
      response: JSON.stringify(json),
    });
    throw new Error(`TikTok Business OAuth ${context} error: missing data`);
  }

  return json.data;
}

function parseScopes(scope?: string | string[]): string[] {
  if (!scope) {
    return [];
  }

  if (Array.isArray(scope)) {
    return scope.filter((value) => !!value);
  }

  return scope
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
/**
 * TikTok Business API OAuth Service for Account Holders (Organic Content)
 *
 * This handles authentication for TikTok Business account holders who want to:
 * - Post organic video content
 * - Manage comments
 * - Access video metrics and insights
 *
 * This uses the TikTok Business API v1.3 Account Holder authorization flow.
 * For Marketing API (advertiser accounts), see tiktok-advertiser-oauth-service.ts
 *
 * API Documentation: https://business-api.tiktok.com/portal/docs?id=1738373164380162
 */
export class TikTokBusinessOAuthService {
  private businessRedirectUri(): string {
    // TikTok Account Holder OAuth redirect URI
    return `${env.VITE_DASHBOARD_URL}/api/connected_accounts/tiktok_business/callback`;
  }

  private get clientId(): string {
    return env.TIKTOK_BIZ_APP_ID;
  }

  private get clientSecret(): string {
    return env.TIKTOK_BIZ_APP_SECRET;
  }

  private get webhookCallbackUrl(): string {
    return `${env.VITE_DASHBOARD_URL}/webhooks/tiktok-business`;
  }

  /**
   * Scopes needed for organic content management:
   * - user.info.basic: Basic user information
   * - user.info.username: Username
   * - user.info.profile: Profile information (display name, avatar)
   * - user.info.stats: Follower counts, etc.
   * - user.account.type: Account type (personal/business)
   * - user.insights: User-level insights
   * - video.list: List user's videos
   * - video.publish: Publish videos
   * - video.upload: Upload video files
   * - video.insights: Video analytics
   * - comment.list: Read comments
   * - comment.list.manage: Manage (reply to) comments
   * - biz.spark.auth: Business Spark authorization (for branded content)
   */
  private getScopes(): string {
    return [
      "user.info.basic",
      "user.info.username",
      "user.info.profile",
      "user.info.stats",
      "user.account.type",
      "user.insights",
      "video.list",
      "video.publish",
      "video.upload",
      "video.insights",
      "comment.list",
      "comment.list.manage",
      "biz.spark.auth",
    ].join(",");
  }

  /**
   * Generate TikTok Account Holder OAuth URL
   * Uses the TikTok v2 authorization URL but with Business API backend
   */
  async getLoginUrl(state: string): Promise<{ url: string; state: string }> {
    const params = new URLSearchParams({
      client_key: this.clientId,
      scope: this.getScopes(),
      response_type: "code",
      redirect_uri: this.businessRedirectUri(),
      state,
    });

    return {
      url: `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for access token
   * Uses Business API v1.3 endpoint with JSON body
   */
  async getAccessToken(authCode: string): Promise<TikTokBusinessTokenData> {
    const body = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      auth_code: authCode,
      grant_type: "authorization_code",
      redirect_uri: this.businessRedirectUri(),
    };

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Business access token request failed", {
        status: response.status,
        body: errorText,
      });
      throw new Error(
        `Failed to get TikTok Business access token: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokBusinessTokenResponse;
    const data = ensureBusinessTokenData(json, "token exchange");
    log.info("TikTok Business OAuth access token obtained", {
      openId: data.open_id,
    });
    return data;
  }

  /**
   * Refresh access token using refresh token
   * Uses Business API v1.3 endpoint with JSON body
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TikTokBusinessTokenData> {
    const body = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Business token refresh failed", {
        status: response.status,
        body: errorText,
      });
      throw new Error(
        `Failed to refresh TikTok Business token: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokBusinessTokenResponse;
    const data = ensureBusinessTokenData(json, "refresh");
    log.info("TikTok Business OAuth access token refreshed", {
      openId: data.open_id,
    });
    return data;
  }

  /**
   * Retrieve TikTok user profile using access token
   * Uses Business API v1.3 /business/get/ endpoint
   */
  async getUserProfile(
    accessToken: string,
    openId: string,
  ): Promise<TikTokBusinessUserData> {
    const fields = [
      "display_name",
      "username",
      "profile_image",
      "profile_deep_link",
      "bio_description",
      "is_verified",
      "is_business_account",
      "followers_count",
      "following_count",
      "total_likes",
      "videos_count",
    ];

    const params = new URLSearchParams({
      business_id: openId,
      fields: JSON.stringify(fields),
    });

    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/business/get/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Access-Token": accessToken,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Business user profile request failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to get TikTok Business user profile: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokBusinessUserInfoResponse;
    log.info("TikTok Business user info response", {
      code: json.code,
      hasData: !!json.data,
    });

    // Check for API error
    if (json.code !== 0) {
      log.warn("TikTok Business user info API error", {
        code: json.code,
        message: json.message,
      });
      throw new Error(
        `TikTok Business user info error: ${json.message || `code ${json.code}`}`,
      );
    }

    const data = json.data;

    if (!data) {
      log.warn("TikTok Business user info missing", {
        response: JSON.stringify(json),
      });
      throw new Error("TikTok Business user info error: missing user data");
    }

    return data;
  }

  /**
   * Complete TikTok Business authentication flow (Account Holder API)
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
  }): Promise<TikTokBusinessAuthTokenDetails> {
    log.info("TikTok Business authenticate", {
      workspaceSlug: params.workspaceSlug,
    });

    const tokenData = await this.getAccessToken(params.code);
    const user = await this.getUserProfile(
      tokenData.access_token,
      tokenData.open_id,
    );

    const permissions = parseScopes(tokenData.scope);
    const displayName = user.display_name || user.username || tokenData.open_id;

    return {
      id: tokenData.open_id,
      name: displayName,
      username: user.username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      refreshTokenExpiresIn: tokenData.refresh_token_expires_in,
      expiresIn: tokenData.expires_in,
      picture: user.profile_image || "",
      permissions,
      unionId: undefined, // v1.3 business API doesn't return union_id
      followerCount: user.followers_count,
      followingCount: user.following_count,
    };
  }

  private async updateWebhookConfiguration(
    eventType: TikTokWebhookEventType,
    itemList?: string[],
  ): Promise<void> {
    const body = {
      app_id: this.clientId,
      secret: this.clientSecret,
      event_type: eventType,
      callback_url: this.webhookCallbackUrl,
      ...(itemList && itemList.length > 0 ? { item_list: itemList } : {}),
    };

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/business/webhook/update/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Business webhook update HTTP failure", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        eventType,
      });
      throw new Error(
        `Failed to configure TikTok Business webhook (${eventType})`,
      );
    }

    const json = (await response.json()) as TikTokWebhookResponse;
    if (json.code !== 0) {
      log.warn("TikTok Business webhook update API failure", {
        eventType,
        code: json.code,
        message: json.message,
        requestId: json.request_id,
      });
      throw new Error(
        `TikTok Business webhook update error (${eventType}): ${json.message ?? json.code}`,
      );
    }

    log.info("TikTok Business webhook configured", {
      eventType,
      requestId: json.request_id,
    });
  }

  private async deleteWebhookConfiguration(
    eventType: TikTokWebhookEventType,
  ): Promise<void> {
    const body = {
      app_id: this.clientId,
      secret: this.clientSecret,
      event_type: eventType,
    };

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/business/webhook/delete/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Business webhook delete HTTP failure", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        eventType,
      });
      throw new Error(
        `Failed to delete TikTok Business webhook (${eventType})`,
      );
    }

    const json = (await response.json()) as TikTokWebhookResponse;
    if (json.code !== 0) {
      log.warn("TikTok Business webhook delete API failure", {
        eventType,
        code: json.code,
        message: json.message,
        requestId: json.request_id,
      });
      throw new Error(
        `TikTok Business webhook delete error (${eventType}): ${json.message ?? json.code}`,
      );
    }

    log.info("TikTok Business webhook deleted", {
      eventType,
      requestId: json.request_id,
    });
  }

  async setupWebhook(): Promise<void> {
    await this.updateWebhookConfiguration("VIDEO");
    await this.updateWebhookConfiguration("COMMENT");
  }

  async teardownWebhook(): Promise<void> {
    await this.deleteWebhookConfiguration("VIDEO");
    await this.deleteWebhookConfiguration("COMMENT");
  }
}

export const tikTokBusinessOAuthService = new TikTokBusinessOAuthService();
