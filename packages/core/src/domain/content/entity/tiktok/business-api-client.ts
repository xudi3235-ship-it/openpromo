import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { TikTokFeedPlacementSpec } from "@core/schemas/content.sql";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "tiktok-business-api-client" });

export interface TikTokBusinessIdentityContext {
  accessToken: string;
  refreshToken?: string | null;
  businessId: string; // open_id from Business API
  connectedAccountId: string;
}

interface BusinessAPIResponse<T> {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
}

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export interface TikTokBusinessVideoPublishParams {
  videoUrl: string;
  caption?: string;
  isBrandOrganic?: boolean;
  isBrandedContent?: boolean;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  thumbnailOffset?: number;
  customThumbnailUrl?: string;
  isAiGenerated?: boolean;
  uploadToDraft?: boolean;
  ttoInviteLink?: string;
  isAdsOnly?: boolean;
}

export interface TikTokBusinessPhotoPublishParams {
  photoUrls: string[];
  photoCoverIndex?: number;
  caption?: string;
  title?: string;
  privacyLevel?: TikTokPrivacyLevel;
  disableComment?: boolean;
  autoAddMusic?: boolean;
  isBrandOrganic?: boolean;
  isBrandedContent?: boolean;
  isDraft?: boolean;
}

interface VideoPublishResponse {
  share_id: string;
}

interface PhotoPublishResponse {
  share_id: string;
}

export interface TikTokBusinessPublishStatus {
  status:
    | "PROCESSING_DOWNLOAD"
    | "PUBLISH_COMPLETE"
    | "FAILED"
    | "SEND_TO_USER_INBOX";
  post_ids?: string[];
  reason?: string;
}

export type TikTokBusinessPropertyType = "DOMAIN" | "URL_PREFIX";

export interface TikTokBusinessPropertyEntry {
  property_id: string;
  property_type: TikTokBusinessPropertyType;
  property_url: string;
  property_status: number;
  signature?: string;
  file_name?: string;
}

export interface TikTokBusinessPropertyAddResult {
  property_id: string;
  property_type: TikTokBusinessPropertyType;
  property_url: string;
  signature: string;
  file_name?: string;
}

export interface TikTokBusinessPropertyVerifyResult {
  property_id?: string;
  property_type: TikTokBusinessPropertyType;
  property_url: string;
  property_status: number;
}

/**
 * Client for TikTok Business API v1.3
 * Used for accounts authenticated via Business Login (BUSINESS_LOGIN auth type)
 *
 * This is separate from TikTokDirectPostClient which uses the v2 Developer OAuth API
 */
export class TikTokBusinessAPIClient {
  private constructor(private readonly ctx: TikTokBusinessIdentityContext) {}

  static async forPlacementSpec(
    spec: TikTokFeedPlacementSpec,
  ): Promise<TikTokBusinessAPIClient> {
    const { tiktokUserID, connectedAccountID } = spec.identity;
    if (!tiktokUserID) {
      throw new WorkflowError("TikTok placement spec missing tiktokUserID");
    }

    let account:
      | Awaited<ReturnType<typeof ConnectedAccount.fromID>>
      | Awaited<ReturnType<typeof ConnectedAccount.fromTikTokAccountID>>
      | null = null;

    if (connectedAccountID) {
      try {
        log.info(
          "resolving TikTok Business identity via connected account id",
          {
            connectedAccountID,
            tiktokUserID,
          },
        );
        account = await ConnectedAccount.fromID(connectedAccountID);
      } catch (error) {
        log.warn("failed to resolve TikTok Business connected account by id", {
          connectedAccountID,
          tiktokUserID,
          error: (error as Error).message,
        });
      }
    }

    if (!account) {
      log.info("resolving TikTok Business identity via user id lookup", {
        tiktokUserID,
      });
      account = await ConnectedAccount.fromTikTokAccountID(tiktokUserID);
    }

    if (!account) {
      throw new WorkflowError(
        `connected account not found for TikTok Business user ${tiktokUserID}`,
      );
    }

    // Verify this is a Business Login account
    if (account.tiktokAuthType !== "BUSINESS_LOGIN") {
      throw new WorkflowError(
        `TikTok account ${tiktokUserID} is not a Business Login account (type: ${account.tiktokAuthType})`,
      );
    }

    return new TikTokBusinessAPIClient({
      accessToken: account.encryptedAccessToken,
      refreshToken: account.refreshToken,
      businessId: tiktokUserID,
      connectedAccountId: account.id,
    });
  }

  static fromIdentityContext(
    ctx: TikTokBusinessIdentityContext,
  ): TikTokBusinessAPIClient {
    return new TikTokBusinessAPIClient(ctx);
  }

  get identity(): TikTokBusinessIdentityContext {
    return this.ctx;
  }

  /**
   * Publish a video post using Business API v1.3
   * https://business-api.tiktok.com/portal/docs?id=1742655835568130
   */
  async publishVideo(
    params: TikTokBusinessVideoPublishParams,
  ): Promise<{ shareId: string }> {
    const payload = {
      business_id: this.ctx.businessId,
      video_url: params.videoUrl,
      custom_thumbnail_url: params.customThumbnailUrl,
      post_info: {
        caption: params.caption,
        is_brand_organic: params.isBrandOrganic ?? false,
        is_branded_content: params.isBrandedContent ?? false,
        disable_comment: params.disableComment ?? false,
        disable_duet: params.disableDuet ?? false,
        disable_stitch: params.disableStitch ?? false,
        thumbnail_offset: params.thumbnailOffset ?? 0,
        is_ai_generated: params.isAiGenerated ?? false,
        upload_to_draft: params.uploadToDraft ?? false,
        tto_invite_link: params.ttoInviteLink,
        is_ads_only: params.isAdsOnly ?? false,
      },
    };

    log.info("Publishing video via Business API", {
      businessId: this.ctx.businessId,
      videoUrl: params.videoUrl,
      caption: params.caption?.substring(0, 50),
    });

    const data = await this.post<VideoPublishResponse>(
      "/open_api/v1.3/business/video/publish/",
      payload,
    );

    const shareId = data.share_id;
    if (!shareId) {
      throw new WorkflowError(
        "TikTok Business video publish response missing share_id",
      );
    }

    log.info("Video publish initiated", {
      shareId,
      businessId: this.ctx.businessId,
    });

    return { shareId };
  }

  /**
   * Publish a photo post using Business API v1.3
   * https://business-api.tiktok.com/portal/docs?id=1743172029596673
   */
  async publishPhoto(
    params: TikTokBusinessPhotoPublishParams,
  ): Promise<{ shareId: string }> {
    if (!params.photoUrls || params.photoUrls.length === 0) {
      throw new WorkflowError("At least one photo URL is required");
    }

    if (params.photoUrls.length > 35) {
      throw new WorkflowError(
        "TikTok Business API supports maximum 35 photos per post",
      );
    }

    const payload = {
      business_id: this.ctx.businessId,
      photo_images: params.photoUrls,
      photo_cover_index: params.photoCoverIndex ?? 0,
      post_info: {
        title: params.title,
        caption: params.caption,
        privacy_level: params.privacyLevel ?? "PUBLIC_TO_EVERYONE",
        disable_comment: params.disableComment ?? false,
        auto_add_music: params.autoAddMusic ?? false,
        is_brand_organic: params.isBrandOrganic ?? false,
        is_branded_content: params.isBrandedContent ?? false,
        is_draft: params.isDraft ?? false,
      },
    };

    log.info("Publishing photo via Business API", {
      businessId: this.ctx.businessId,
      photoCount: params.photoUrls.length,
      caption: params.caption?.substring(0, 50),
    });

    const data = await this.post<PhotoPublishResponse>(
      "/open_api/v1.3/business/photo/publish/",
      payload,
    );

    const shareId = data.share_id;
    if (!shareId) {
      throw new WorkflowError(
        "TikTok Business photo publish response missing share_id",
      );
    }

    log.info("Photo publish initiated", {
      shareId,
      businessId: this.ctx.businessId,
      photoCount: params.photoUrls.length,
    });

    return { shareId };
  }

  /**
   * Get the publishing status of a TikTok post
   * https://business-api.tiktok.com/portal/docs?id=1743172029620225
   */
  async getPublishStatus(
    publishId: string,
  ): Promise<TikTokBusinessPublishStatus> {
    const params = new URLSearchParams({
      business_id: this.ctx.businessId,
      publish_id: publishId,
    });

    const data = await this.get<TikTokBusinessPublishStatus>(
      `/open_api/v1.3/business/publish/status/?${params.toString()}`,
    );

    log.info("Fetched publish status", {
      publishId,
      status: data.status,
      postIds: data.post_ids,
      reason: data.reason,
    });

    return data;
  }

  /**
   * Fetch all URL properties for the business account
   */
  async listUrlProperties(): Promise<TikTokBusinessPropertyEntry[]> {
    const params = new URLSearchParams({
      business_id: this.ctx.businessId,
    });
    const data = await this.get<{
      property_list?: TikTokBusinessPropertyEntry[];
    }>(`/open_api/v1.3/business/property/list/?${params.toString()}`);
    return data.property_list ?? [];
  }

  /**
   * Add a URL property (domain or prefix) for the business account
   */
  async addUrlProperty(params: {
    propertyType: TikTokBusinessPropertyType;
    propertyUrl: string;
  }): Promise<{ propertyId: string; signature: string; fileName?: string }> {
    const data = await this.post<TikTokBusinessPropertyAddResult>(
      "/open_api/v1.3/business/property/add/",
      {
        business_id: this.ctx.businessId,
        property_type: params.propertyType,
        property_url: params.propertyUrl,
      },
    );

    if (!data.signature) {
      throw new WorkflowError(
        "TikTok Business property add response missing signature",
      );
    }

    return {
      propertyId: data.property_id,
      signature: data.signature,
      fileName: data.file_name,
    };
  }

  /**
   * Check verification status of a URL property
   */
  async checkUrlProperty(params: {
    propertyType: TikTokBusinessPropertyType;
    propertyUrl: string;
  }): Promise<TikTokBusinessPropertyVerifyResult> {
    const data = await this.post<TikTokBusinessPropertyVerifyResult>(
      "/open_api/v1.3/business/property/verify/",
      {
        business_id: this.ctx.businessId,
        property_type: params.propertyType,
        property_url: params.propertyUrl,
      },
    );
    return data;
  }

  /**
   * GET request to Business API
   */
  private async get<T>(path: string): Promise<T> {
    const url = new URL(path, "https://business-api.tiktok.com");
    let response: Response;

    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Access-Token": this.ctx.accessToken,
        },
      });
    } catch (error) {
      throw new WorkflowError(
        `Failed to call TikTok Business API ${path}: ${(error as Error).message}`,
      );
    }

    return this.handleResponse<T>(response, path);
  }

  /**
   * POST request to Business API
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, "https://business-api.tiktok.com");
    let response: Response;

    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Access-Token": this.ctx.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new WorkflowError(
        `Failed to call TikTok Business API ${path}: ${(error as Error).message}`,
      );
    }

    return this.handleResponse<T>(response, path);
  }

  /**
   * Handle API response and error cases
   */
  private async handleResponse<T>(
    response: Response,
    path: string,
  ): Promise<T> {
    let json: BusinessAPIResponse<T>;

    try {
      json = (await response.json()) as BusinessAPIResponse<T>;
    } catch (error) {
      throw new WorkflowError(
        `TikTok Business API ${path} returned invalid JSON: ${(error as Error).message}`,
      );
    }

    // Business API returns code: 0 for success
    if (!response.ok || json.code !== 0) {
      const message =
        json.message ||
        response.statusText ||
        `TikTok Business API ${path} failed`;
      log.warn("tiktok business api error", {
        path,
        status: response.status,
        code: json.code,
        message: json.message,
        request_id: json.request_id,
      });
      throw new WorkflowError(`TikTok Business API error: ${message}`);
    }

    if (json.data === undefined || json.data === null) {
      throw new WorkflowError(
        `TikTok Business API ${path} returned empty data`,
      );
    }

    return json.data;
  }
}
