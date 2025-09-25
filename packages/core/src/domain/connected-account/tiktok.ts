import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";

interface TikTokTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  refresh_token_expires_in?: number;
  refresh_expire_in?: number;
  open_id: string;
  scope?: string | string[];
  state?: string;
  token_type?: string;
}

interface TikTokTokenResponse {
  data?: TikTokTokenData;
  error?: string;
  error_description?: string;
  message?: string;
}

interface TikTokRefreshTokenResponse {
  data?: TikTokTokenData;
  error?: string;
  error_description?: string;
  message?: string;
}

interface TikTokUser {
  open_id?: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  profile_deep_link?: string;
  username?: string;
}

interface TikTokUserInfoResponse {
  data?: {
    user?: TikTokUser;
  };
  error?: {
    code: number;
    message: string;
  };
  message?: string;
}

export interface TikTokAuthTokenDetails {
  refreshToken: string;
  refreshTokenExpiresIn?: number;
  expiresIn: number;
  accessToken: string;
  id: string;
  name: string;
  permissions: string[];
  picture: string;
  username: string;
  unionId?: string;
}

const log = Log.create({ namespace: "TikTokOAuthService" });

function ensureTokenData(
  json: TikTokTokenResponse | TikTokRefreshTokenResponse,
  context: string,
): TikTokTokenData {
  if (json.error) {
    throw new Error(
      `TikTok OAuth ${context} error: ${json.error_description || json.error}`,
    );
  }

  if (!json.data) {
    throw new Error(`TikTok OAuth ${context} error: missing data`);
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

function safeUsername(user: TikTokUser): string {
  if (user.username) {
    return user.username;
  }

  if (user.profile_deep_link) {
    const handle = user.profile_deep_link.split("@").at(-1);
    return handle ? handle.replace(/\/?$/u, "") : "";
  }

  return user.display_name || user.open_id || "";
}

export class TikTokOAuthService {
  private readonly scopes = [
    "user.info.basic",
    "user.info.profile",
    "video.list",
    "video.publish",
    "video.upload",
  ];

  private redirectUri(): string {
    // tiktok does not allow localhost
    const localOverride = "https://raydev.openpromo.app";
    const base =
      process.env.NODE_ENV === "development"
        ? localOverride
        : env.VITE_DASHBOARD_URL;
    return `${base}/api/connected_accounts/tiktok/callback`;
  }

  private get clientKey(): string {
    return env.TIKTOK_APP_ID;
  }

  private get clientSecret(): string {
    return env.TIKTOK_APP_SECRET;
  }

  /**
   * Generate TikTok OAuth URL for user login
   */
  async getLoginUrl(
    state: string,
    codeVerifier: string,
  ): Promise<{ url: string; state: string; codeVerifier: string }> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: this.redirectUri(),
      state,
      scope: this.scopes.join(","),
      response_type: "code",
    });

    return {
      url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<TikTokTokenData> {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get TikTok access token: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokTokenResponse;
    const data = ensureTokenData(json, "token exchange");
    log.info("TikTok OAuth access token obtained", { openId: data.open_id });
    return data;
  }

  /**
   * Refresh access token using refresh token flow
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenData> {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh TikTok token: ${response.statusText}`);
    }

    const json = (await response.json()) as TikTokRefreshTokenResponse;
    const data = ensureTokenData(json, "refresh");
    log.info("TikTok OAuth access token refreshed", { openId: data.open_id });
    return data;
  }

  /**
   * Retrieve TikTok user profile using access token
   */
  async getUserProfile(accessToken: string): Promise<TikTokUser> {
    const response = await fetch("https://open.tiktokapis.com/v2/user/info/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fields: [
          "open_id",
          "union_id",
          "display_name",
          "avatar_url",
          "profile_deep_link",
          "username",
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get TikTok user profile: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokUserInfoResponse;

    if (json.error) {
      throw new Error(`TikTok user info error: ${json.error.message}`);
    }

    const user = json.data?.user;

    if (!user || !user.open_id) {
      throw new Error("TikTok user info error: missing user identifier");
    }

    return user;
  }

  /**
   * Complete TikTok authentication flow
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
    refresh?: string;
  }): Promise<TikTokAuthTokenDetails> {
    log.info("TikTok authenticate", { workspaceSlug: params.workspaceSlug });

    const tokenData = await this.getAccessToken(params.code);
    const user = await this.getUserProfile(tokenData.access_token);

    const permissions = parseScopes(tokenData.scope);
    const username = safeUsername(user);

    return {
      id: tokenData.open_id,
      name: user.display_name || username || tokenData.open_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      refreshTokenExpiresIn:
        tokenData.refresh_expires_in || tokenData.refresh_token_expires_in,
      expiresIn: tokenData.expires_in,
      picture: user.avatar_url || "",
      username,
      unionId: user.union_id,
      permissions,
    };
  }
}

export const tikTokOAuthService = new TikTokOAuthService();
