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

interface TikTokBusinessUser {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name?: string;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
  bio_description?: string;
}

interface TikTokBusinessUserInfoResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: {
    user?: TikTokBusinessUser;
  };
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
   * Uses Business API v1.3 endpoint
   */
  async getUserProfile(
    accessToken: string,
    openId: string,
  ): Promise<TikTokBusinessUser> {
    const fields = [
      "open_id",
      "union_id",
      "avatar_url",
      "avatar_url_100",
      "avatar_large_url",
      "display_name",
      "bio_description",
      "follower_count",
      "following_count",
      "likes_count",
      "video_count",
    ];

    const params = new URLSearchParams({
      open_id: openId,
      fields: fields.join(","),
    });

    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/tt_user/info/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
      hasData: !!json.data?.user,
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

    const user = json.data?.user;

    if (!user) {
      log.warn("TikTok Business user info missing", {
        response: JSON.stringify(json),
      });
      throw new Error("TikTok Business user info error: missing user data");
    }

    return user;
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
    const displayName = user.display_name || user.username || user.open_id;

    return {
      id: user.open_id,
      name: displayName,
      username: user.username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      refreshTokenExpiresIn: tokenData.refresh_token_expires_in,
      expiresIn: tokenData.expires_in,
      picture:
        user.avatar_url || user.avatar_url_100 || user.avatar_large_url || "",
      permissions,
      unionId: user.union_id,
      followerCount: user.follower_count,
      followingCount: user.following_count,
    };
  }
}

export const tikTokBusinessOAuthService = new TikTokBusinessOAuthService();
