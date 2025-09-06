import { env } from "../../helpers/env";
import { Log } from "../../util/log";

interface InstagramProfile {
  id: string;
  username: string;
  account_type: "BUSINESS" | "MEDIA_CREATOR" | "PERSONAL";
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
}

interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  permissions: string;
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramTokenError {
  error_type: string;
  code: number;
  error_message: string;
}

export interface AuthTokenDetails {
  refreshToken: string;
  expiresIn: number;
  accessToken: string;
  id: string;
  name: string;
  picture: string;
  username: string;
}

const log = Log.create({ namespace: "InstagramOAuthService" });

export class InstagramOAuthService {
  // Instagram Business Login scopes
  // https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
  private readonly scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ];

  private redirectUri(): string {
    return `${env.DASHBOARD_URL}/api/connected_accounts/instagram/callback`;
  }

  private get appId(): string {
    return env.INSTAGRAM_APP_ID;
  }

  private get appSecret(): string {
    return env.INSTAGRAM_APP_SECRET;
  }

  /**
   * Generate Instagram OAuth URL for user login
   * Uses Instagram's specific OAuth endpoint
   */
  async getLoginUrl(
    state: string,
    codeVerifier: string,
  ): Promise<{ url: string; state: string; codeVerifier: string }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri(),
      state: state,
      scope: this.scopes.join(","),
      response_type: "code",
    });

    return {
      // Instagram uses its own OAuth endpoint
      url: `https://www.instagram.com/oauth/authorize?${params.toString()}`,
      state: state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access token
   * Uses Instagram's specific token endpoint
   */
  async getAccessToken(code: string): Promise<InstagramTokenResponse> {
    const formData = new FormData();
    formData.append("client_id", this.appId);
    formData.append("client_secret", this.appSecret);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", this.redirectUri());
    formData.append("code", code);

    const response = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const tokenData = (await response.json()) as
      | InstagramTokenResponse
      | InstagramTokenError;

    if ("error_type" in tokenData) {
      throw new Error(`Instagram OAuth error: ${tokenData.error_message}`);
    }

    log.info("Instagram OAuth access token obtained");
    return tokenData;
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * Uses Instagram Graph API endpoint
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: this.appSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to exchange token: ${response.statusText}`);
    }

    const tokenData =
      (await response.json()) as InstagramLongLivedTokenResponse;
    return tokenData;
  }

  /**
   * Get user profile information using access token
   * Uses Instagram Graph API
   */
  async getUserProfile(accessToken: string): Promise<InstagramProfile> {
    const response = await fetch(
      `https://graph.instagram.com/v23.0/me?fields=id,username,account_type,media_count,followers_count,follows_count,name,biography,profile_picture_url,website&access_token=${accessToken}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get user profile", { errorText });
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    return (await response.json()) as InstagramProfile;
  }

  /**
   * Complete authentication flow
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
    refresh?: string;
  }): Promise<AuthTokenDetails> {
    log.info("1. authenticate");

    // Get short-lived access token
    const shortTokenResponse = await this.getAccessToken(params.code);

    log.info("2. Short-lived access token obtained");

    // Exchange for long-lived token
    const longToken = await this.exchangeForLongLivedToken(
      shortTokenResponse.access_token,
    );
    log.info("Long-lived access token obtained");

    // Get user profile using the user ID from the token response
    const profile = await this.getUserProfile(longToken.access_token);
    log.info("User profile obtained");

    return {
      id: profile.id,
      name: profile.name || profile.username,
      accessToken: longToken.access_token,
      refreshToken: longToken.access_token, // Instagram doesn't provide separate refresh tokens
      expiresIn: longToken.expires_in,
      picture: profile.profile_picture_url || "",
      username: profile.username,
    };
  }

  /**
   * Reconnect to a specific Instagram account
   */
  async reConnect(accessToken: string): Promise<AuthTokenDetails> {
    const profile = await this.getUserProfile(accessToken);

    // Calculate expiration (60 days)
    const expiresIn = 5184000; // 60 days

    return {
      id: profile.id,
      name: profile.name || profile.username,
      accessToken: accessToken,
      refreshToken: accessToken,
      expiresIn,
      picture: profile.profile_picture_url || "",
      username: profile.username,
    };
  }

  /**
   * Refresh a long-lived access token
   */
  async refreshAccessToken(
    accessToken: string,
  ): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    return (await response.json()) as InstagramLongLivedTokenResponse;
  }
}

// Export singleton instance
export const instagramOAuthService = new InstagramOAuthService();
