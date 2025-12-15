/**
 * NOT IN USE: This service is not in use since 2025-12-10.
 *
 * TikTok Marketing API integration is planned but not yet implemented.
 * This file contains the OAuth service for TikTok advertiser accounts but is not exposed in the UI.
 *
 * Status: Implementation complete, but not integrated into the main application flow.
 * To enable: Add route registration in workspaces/connected-accounts and expose in frontend.
 */
import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";

interface TikTokAdvertiserTokenData {
  access_token: string;
  advertiser_ids?: string[];
  advertiser_id?: string;
}

interface TikTokAdvertiserTokenResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: TikTokAdvertiserTokenData;
}

interface TikTokAdvertiserInfo {
  advertiser_id: string;
  advertiser_name: string;
  profile_image_url?: string;
}

interface TikTokAdvertiserInfoResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: {
    list?: TikTokAdvertiserInfo[];
  };
}

export interface TikTokAdvertiserAuthTokenDetails {
  advertiserId: string;
  advertiserName: string;
  accessToken: string;
  profilePicUrl: string;
  permissions: string[];
}

const log = Log.create({ namespace: "TikTokAdvertiserOAuthService" });

function ensureAdvertiserTokenData(
  json: TikTokAdvertiserTokenResponse,
  context: string,
): TikTokAdvertiserTokenData {
  const responseCode = typeof json.code === "number" ? json.code : -1;

  // TikTok Marketing API returns code: 0 for success
  if (responseCode !== 0) {
    const description = json.message || `error code ${responseCode}`;
    throw new Error(`TikTok Advertiser OAuth ${context} error: ${description}`);
  }

  if (!json.data) {
    log.warn("TikTok Advertiser OAuth unexpected response", {
      context,
      response: JSON.stringify(json),
    });
    throw new Error(`TikTok Advertiser OAuth ${context} error: missing data`);
  }

  return json.data;
}

/**
 * TikTok Marketing API OAuth Service for Advertiser Accounts
 * Uses the /portal/auth endpoint for advertiser authorization
 */
export class TikTokAdvertiserOAuthService {
  private advertiserRedirectUri(): string {
    return `${env.VITE_DASHBOARD_URL}/api/connected_accounts/tiktok_advertiser/callback`;
  }

  private get advertiserAppId(): string {
    return env.TIKTOK_BIZ_APP_ID;
  }

  private get advertiserAppSecret(): string {
    return env.TIKTOK_BIZ_APP_SECRET;
  }

  /**
   * Generate TikTok Marketing API OAuth URL for advertiser authorization
   */
  async getLoginUrl(state: string): Promise<{ url: string; state: string }> {
    const params = new URLSearchParams({
      app_id: this.advertiserAppId,
      state,
      redirect_uri: this.advertiserRedirectUri(),
    });

    return {
      url: `https://business-api.tiktok.com/portal/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for access token (Marketing API flow)
   */
  async getAccessToken(authCode: string): Promise<TikTokAdvertiserTokenData> {
    const body = {
      app_id: this.advertiserAppId,
      secret: this.advertiserAppSecret,
      auth_code: authCode,
    };

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
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
        `Failed to get TikTok Advertiser access token: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokAdvertiserTokenResponse;
    const data = ensureAdvertiserTokenData(json, "token exchange");

    log.info("TikTok Advertiser OAuth access token obtained", {
      advertiserIds: data.advertiser_ids,
    });

    return data;
  }

  /**
   * Get advertiser account information
   */
  async getAdvertiserInfo(
    accessToken: string,
    advertiserIds: string[],
  ): Promise<TikTokAdvertiserInfo> {
    const params = new URLSearchParams({
      advertiser_ids: JSON.stringify(advertiserIds),
      fields: JSON.stringify([
        "advertiser_id",
        "advertiser_name",
        "profile_image_url",
      ]),
    });

    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Access-Token": accessToken,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.warn("TikTok Advertiser info request failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to get TikTok Advertiser info: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as TikTokAdvertiserInfoResponse;

    if (json.code !== 0 || !json.data?.list || json.data.list.length === 0) {
      log.warn("TikTok Advertiser info missing or invalid", {
        response: JSON.stringify(json),
      });
      throw new Error("TikTok Advertiser info error: no advertiser data");
    }

    // Return the first advertiser (in most cases there's only one)
    return json.data.list[0];
  }

  /**
   * Complete TikTok Advertiser authentication flow
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
  }): Promise<TikTokAdvertiserAuthTokenDetails> {
    log.info("TikTok Advertiser authenticate", {
      workspaceSlug: params.workspaceSlug,
    });

    const tokenData = await this.getAccessToken(params.code);

    // Get advertiser IDs - could be multiple, but we'll use the first one
    const advertiserIds =
      tokenData.advertiser_ids ||
      (tokenData.advertiser_id ? [tokenData.advertiser_id] : []);

    if (advertiserIds.length === 0) {
      throw new Error("No advertiser IDs returned from TikTok");
    }

    const advertiserInfo = await this.getAdvertiserInfo(
      tokenData.access_token,
      advertiserIds,
    );

    return {
      advertiserId: advertiserInfo.advertiser_id,
      advertiserName:
        advertiserInfo.advertiser_name || advertiserInfo.advertiser_id,
      accessToken: tokenData.access_token,
      profilePicUrl: advertiserInfo.profile_image_url || "",
      permissions: [], // Marketing API doesn't return scopes in the same way
    };
  }
}

export const tikTokAdvertiserOAuthService = new TikTokAdvertiserOAuthService();
