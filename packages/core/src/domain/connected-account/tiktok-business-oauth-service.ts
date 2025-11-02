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
  business_account_id?: string;
  business_name?: string;
  avatar_url?: string;
  industry_category?: string;
  business_type?: string;
}

interface TikTokBusinessUserInfoResponse {
  data?: {
    user?: TikTokBusinessUser;
  };
  error?: {
    code: number;
    message: string;
  };
  message?: string;
  error_code?: number;
  description?: string;
}

export interface TikTokBusinessAuthTokenDetails {
  refreshToken: string;
  refreshTokenExpiresIn?: number;
  expiresIn: number;
  accessToken: string;
  id: string;
  name: string;
  permissions: string[];
  picture: string;
  businessType?: string;
  industryCategory?: string;
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
 * WARNING: NOT READY YET. Tiktok business messaging api requires application
 * and we're still early in the process.
 *
 * i dont think we're gonna have this for MVP scope yet.
 */
export class TikTokBusinessOAuthService {
  private businessRedirectUri(): string {
    // TikTok for Business OAuth redirect URI
    return `${env.VITE_DASHBOARD_URL}/api/connected_accounts/tiktok_business/callback`;
  }

  private get businessAppId(): string {
    return env.TIKTOK_BIZ_APP_ID;
  }

  private get businessAppSecret(): string {
    return env.TIKTOK_BIZ_APP_SECRET;
  }

  /**
   * Generate TikTok Business OAuth URL for user login
   */
  async getLoginUrl(state: string): Promise<{ url: string; state: string }> {
    const params = new URLSearchParams({
      app_id: this.businessAppId,
      redirect_uri: this.businessRedirectUri(),
      state,
    });

    return {
      url: `https://business-api.tiktok.com/portal/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for access token (TikTok for Business flow)
   */
  async getAccessToken(authCode: string): Promise<TikTokBusinessTokenData> {
    const body = {
      client_id: this.businessAppId,
      client_secret: this.businessAppSecret,
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
   * Refresh access token using refresh token flow
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TikTokBusinessTokenData> {
    const body = {
      client_id: this.businessAppId,
      client_secret: this.businessAppSecret,
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
   * Retrieve TikTok Business user profile using access token
   */
  async getUserProfile(accessToken: string): Promise<TikTokBusinessUser> {
    const response = await fetch(
      "https://business-api.tiktok.com/v1/business/info/?fields=business_account_id,business_name,avatar_url,industry_category,business_type",
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
    console.log("TikTok Business user info response", JSON.stringify(json));

    const user = json.data?.user;

    if (!user || !user.business_account_id) {
      log.warn("TikTok Business user info missing identifier", {
        response: JSON.stringify(json),
      });
      throw new Error(
        "TikTok Business user info error: missing business account identifier",
      );
    }

    return user;
  }

  /**
   * Complete TikTok Business authentication flow
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
  }): Promise<TikTokBusinessAuthTokenDetails> {
    log.info("TikTok Business authenticate", {
      workspaceSlug: params.workspaceSlug,
    });

    const tokenData = await this.getAccessToken(params.code);
    const user = await this.getUserProfile(tokenData.access_token);

    const permissions = parseScopes(tokenData.scope);

    return {
      id: tokenData.open_id,
      name: user.business_name || tokenData.open_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      refreshTokenExpiresIn: tokenData.refresh_token_expires_in,
      expiresIn: tokenData.expires_in,
      picture: user.avatar_url || "",
      permissions,
      businessType: user.business_type,
      industryCategory: user.industry_category,
    };
  }
}

export const tikTokBusinessOAuthService = new TikTokBusinessOAuthService();
