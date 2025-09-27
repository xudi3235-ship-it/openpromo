import { createHash } from "node:crypto";
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
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  refresh_token_expires_in?: number;
  refresh_expire_in?: number;
  open_id?: string;
  scope?: string | string[];
  state?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  error_code?: number;
  description?: string;
  message?: string;
}

type TikTokRefreshTokenResponse = TikTokTokenResponse;

interface TikTokUser {
  open_id?: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  profile_deep_link?: string;
  username?: string;
}

interface TikTokError {
  code: number;
  message: string;
}

interface TikTokUserInfoResponse {
  data?: {
    user?: TikTokUser;
  };
  error?: TikTokError;
  message?: string;
  error_code?: number;
  description?: string;
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
  const errorCode = typeof json.error_code === "number" ? json.error_code : 0;
  if (json.error || errorCode !== 0) {
    const description =
      json.error_description ||
      json.description ||
      json.message ||
      (json.error ? `code ${json.error}` : `error_code ${errorCode}`);
    throw new Error(`TikTok OAuth ${context} error: ${description}`);
  }

  if (!json.data) {
    // TikTok sometimes returns top-level token fields instead of wrapping them in data
    if (json.access_token && json.open_id) {
      const topLevel: TikTokTokenData = {
        access_token: json.access_token,
        refresh_token: json.refresh_token || "",
        expires_in: json.expires_in ?? 0,
        refresh_expires_in:
          json.refresh_expires_in ?? json.refresh_token_expires_in,
        refresh_token_expires_in: json.refresh_token_expires_in,
        refresh_expire_in: json.refresh_expire_in,
        open_id: json.open_id,
        scope: json.scope,
        token_type: json.token_type,
      };
      return topLevel;
    }

    log.warn("TikTok OAuth unexpected response", {
      context,
      response: JSON.stringify(json),
    });
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
    // tiktok oauth does not allow localhost
    // so we use cloudflare tunnel
    return `${env.VITE_DASHBOARD_URL}/api/connected_accounts/tiktok/callback`;
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
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/u, "");

    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: this.redirectUri(),
      state,
      scope: this.scopes.join(","),
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
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
  async getAccessToken(
    code: string,
    codeVerifier?: string,
  ): Promise<TikTokTokenData> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri(),
    });

    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
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
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
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
    const fields = [
      "open_id",
      "union_id",
      "display_name",
      "avatar_url",
      "profile_deep_link",
      "username",
    ].join(",");

    const response = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok user profile request failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to get TikTok user profile: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokUserInfoResponse;
    console.log("TikTok user info response", JSON.stringify(json));

    const user = json.data?.user;

    if (!user || !user.open_id) {
      log.warn("TikTok user info missing identifier", {
        response: JSON.stringify(json),
      });
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
    codeVerifier?: string;
  }): Promise<TikTokAuthTokenDetails> {
    log.info("TikTok authenticate", { workspaceSlug: params.workspaceSlug });

    const tokenData = await this.getAccessToken(
      params.code,
      params.codeVerifier,
    );
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
