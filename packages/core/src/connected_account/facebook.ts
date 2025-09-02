import { env } from "../env";
import { Log } from "../util/log";

interface FacebookProfile {
  id: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
  email?: string;
}

interface FacebookTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface FacebookPermission {
  permission: string;
  status: string;
}

interface FacebookPage {
  id: string;
  name: string;
  username?: string;
  access_token?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  category?: string;
  fan_count?: number;
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

const log = Log.create({ namespace: "FacebookOAuthService" });

export class FacebookOAuthService {
  // https://developers.facebook.com/docs/permissions
  // we will incrementally request permissions as needed
  // NOTE: permissions are divided into basic access & advanced access
  // 2nd one needs app review + business verifications
  private readonly scopes = [
    "pages_show_list",
    "business_management",
    "pages_manage_posts",
    "pages_manage_engagement",
    "pages_read_engagement",
    "read_insights",
  ];

  private redirectUri(workspaceSlug: string): string {
    throw new Error("TODO: migrate off Resource.Urls.site" + workspaceSlug);
    // return `${Resource.Urls.site}/api/workspaces/${workspaceSlug}/connected_accounts/facebook/callback`;
  }

  private get appId(): string {
    return env.FACEBOOK_APP_ID;
  }

  private get appSecret(): string {
    return env.FACEBOOK_APP_SECRET;
  }

  private get baseUrl(): string {
    const version = "v23.0";
    return `https://graph.facebook.com/${version}`;
  }

  /**
   * Generate Facebook OAuth URL for user login
   */
  async getLoginUrl(
    state: string,
    codeVerifier: string,
    workspaceSlug: string,
  ): Promise<{ url: string; state: string; codeVerifier: string }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri(workspaceSlug),
      state: state,
      scope: this.scopes.join(","),
      response_type: "code",
    });

    return {
      // not graph api
      url: `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`,
      state: state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(
    code: string,
    workspaceSlug: string,
  ): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: this.redirectUri(workspaceSlug),
      code,
    });

    const response = await fetch(
      `${this.baseUrl}/oauth/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const tokenData = (await response.json()) as FacebookTokenResponse;

    if (tokenData.error) {
      throw new Error(`Facebook OAuth error: ${tokenData.error.message}`);
    }
    log.info("Facebook OAuth access token obtained", { tokenData });

    return tokenData;
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<FacebookTokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const url = new URL(response.url);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("client_secret", this.appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedResponse = await fetch(url.toString());

    if (!longLivedResponse.ok) {
      throw new Error(
        `Failed to exchange token: ${longLivedResponse.statusText}`,
      );
    }

    const tokenData = (await longLivedResponse.json()) as FacebookTokenResponse;

    if (tokenData.error) {
      throw new Error(`Token exchange error: ${tokenData.error.message}`);
    }

    return tokenData;
  }

  /**
   * Get user profile information using access token
   */
  async getUserProfile(accessToken: string): Promise<FacebookProfile> {
    const response = await fetch(
      `${this.baseUrl}/me?fields=id,name,picture.width(200).height(200),email&access_token=${accessToken}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    return (await response.json()) as FacebookProfile;
  }

  /**
   * Verify permissions are granted
   */
  async verifyPermissions(accessToken: string): Promise<string[]> {
    const response = await fetch(
      `${this.baseUrl}/me/permissions?access_token=${accessToken}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to verify permissions: ${response.statusText}`);
    }

    const { data } = (await response.json()) as { data: FacebookPermission[] };

    const grantedPermissions = data
      .filter((d) => d.status === "granted")
      .map((p) => p.permission);

    // Check if required scopes are granted
    for (const scope of this.scopes) {
      if (!grantedPermissions.includes(scope)) {
        throw new Error(`Missing required permission: ${scope}`);
      }
    }

    return grantedPermissions;
  }

  /**
   * Get user's Facebook pages. This gives us the list of FB pages that
   * user granted access. Datamodel wise, it's User 1..N Page
   */
  async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
      `${this.baseUrl}/me/accounts?fields=id,username,name,picture.type(large),category,fan_count,access_token&access_token=${accessToken}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get user pages: ${response.statusText}`);
    }

    const { data } = (await response.json()) as { data: FacebookPage[] };
    return data || [];
  }

  /**
   * Get page information by ID
   */
  async getPageInformation(
    accessToken: string,
    pageId: string,
  ): Promise<{
    id: string;
    name: string;
    access_token: string;
    picture: string;
    username: string;
  }> {
    const response = await fetch(
      `${this.baseUrl}/${pageId}?fields=username,access_token,name,picture.type(large)&access_token=${accessToken}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get page information: ${response.statusText}`);
    }

    const pageData = (await response.json()) as FacebookPage;

    return {
      id: pageData.id,
      name: pageData.name,
      access_token: pageData.access_token || "",
      picture: pageData.picture?.data?.url || "",
      username: pageData.username || "",
    };
  }

  /**
   * Complete authentication flow
   */
  async authenticate(params: {
    code: string;
    workspaceSlug: string;
    refresh?: string;
  }): Promise<AuthTokenDetails> {
    log.info("authenticate");
    // Get short-lived access token
    const shortToken = await this.getAccessToken(
      params.code,
      params.workspaceSlug,
    );

    log.info("Short-lived access token obtained", { shortToken });
    // Exchange for long-lived token
    const longToken = await this.exchangeForLongLivedToken(
      shortToken.access_token,
    );

    log.info("Long-lived access token obtained", { longToken });

    // Verify permissions
    await this.verifyPermissions(longToken.access_token);

    // Get user profile
    const profile = await this.getUserProfile(longToken.access_token);
    log.info("User profile obtained", { profile });

    // Calculate expiration (60 days or from response)
    const expiresIn = longToken.expires_in || 5184000; // 60 days default

    return {
      id: profile.id,
      name: profile.name,
      accessToken: longToken.access_token,
      refreshToken: longToken.access_token, // Facebook doesn't provide separate refresh tokens
      expiresIn,
      picture: profile.picture?.data?.url || "",
      username: "",
    };
  }

  /**
   * Reconnect to a specific page
   */
  async reConnect(
    requiredId: string,
    accessToken: string,
  ): Promise<AuthTokenDetails> {
    const pageInfo = await this.getPageInformation(accessToken, requiredId);

    // Calculate expiration (60 days)
    const expiresIn = 5184000; // 60 days

    return {
      id: pageInfo.id,
      name: pageInfo.name,
      accessToken: pageInfo.access_token,
      refreshToken: pageInfo.access_token,
      expiresIn,
      picture: pageInfo.picture,
      username: pageInfo.username,
    };
  }
}

// Export singleton instance
export const facebookOAuthService = new FacebookOAuthService();
