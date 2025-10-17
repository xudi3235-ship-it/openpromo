import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { TikTokFeedPlacementSpec } from "@core/schemas/content.sql";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "tiktok-direct-post-client" });

export interface TikTokIdentityContext {
  accessToken: string;
  refreshToken?: string | null;
  tiktokUserID: string;
  connectedAccountID: string;
}

type TikTokAPIError = {
  code?: string | number;
  message?: string;
  log_id?: string;
};

interface TikTokAPIResponse<T> {
  data?: T;
  error?: TikTokAPIError;
}

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

interface TikTokVideoInitResponse {
  publish_id: string;
  upload_url?: string;
}

interface TikTokPhotoInitResponse {
  publish_id: string;
}

interface TikTokPublishStatusResponse {
  publish_id: string;
  status: string;
  post_id?: string;
  share_id?: string;
  share_url?: string;
  fail_reason?: string;
  message?: string;
}

export interface TikTokPublishStatus {
  status: string;
  shareUrl?: string;
  failReason?: string;
  message?: string;
}

export type TikTokPublishStatusResult = TikTokPublishStatusResponse &
  TikTokPublishStatus;

export interface TikTokVideoDirectPostParams {
  videoUrl: string;
  caption?: string;
  mimeType?: string;
  coverTimestampMs?: number;
  videoCoverTimestampsMs?: number[];
  privacyLevel?: TikTokPrivacyLevel;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  autoAddMusic?: boolean;
  allowAdvancedBoost?: boolean;
  mentionUserIds?: string[];
  brandedContentTag?: {
    business_partner_id: string;
    display_on_video: boolean;
  };
}

export interface TikTokPhotoDirectPostParams {
  photoUrls: string[];
  caption?: string;
  privacyLevel?: TikTokPrivacyLevel;
  disableComment?: boolean;
  autoAddMusic?: boolean;
  allowAdvancedBoost?: boolean;
  mentionUserIds?: string[];
  brandedContentTag?: {
    business_partner_id: string;
    display_on_video: boolean;
  };
  photoCoverIndex?: number;
}

export class TikTokDirectPostClient {
  private constructor(private readonly ctx: TikTokIdentityContext) {}

  static async forPlacementSpec(
    spec: TikTokFeedPlacementSpec,
  ): Promise<TikTokDirectPostClient> {
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
        log.info("resolving TikTok identity via connected account id", {
          connectedAccountID,
          tiktokUserID,
        });
        account = await ConnectedAccount.fromID(connectedAccountID);
      } catch (error) {
        log.warn("failed to resolve TikTok connected account by id", {
          connectedAccountID,
          tiktokUserID,
          error: (error as Error).message,
        });
      }
    }

    if (!account) {
      log.info("resolving TikTok identity via user id lookup", {
        tiktokUserID,
      });
      account = await ConnectedAccount.fromTikTokAccountID(tiktokUserID);
    }

    if (!account) {
      throw new WorkflowError(
        `connected account not found for TikTok user ${tiktokUserID}`,
      );
    }

    return new TikTokDirectPostClient({
      accessToken: account.encryptedAccessToken,
      refreshToken: account.refreshToken,
      tiktokUserID,
      connectedAccountID: account.id,
    });
  }

  get identity(): TikTokIdentityContext {
    return this.ctx;
  }

  async queryCreatorInfo(): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      "/v2/post/publish/creator_info/query/",
      {},
    );
  }

  async initVideoPost(
    payload: unknown,
  ): Promise<{ publishId: string; uploadUrl?: string }> {
    const data = await this.post<TikTokVideoInitResponse>(
      "/v2/post/publish/video/init/",
      payload,
    );

    const publishId = data.publish_id;
    if (!publishId) {
      throw new WorkflowError("TikTok video init response missing publish_id");
    }

    return { publishId, uploadUrl: data.upload_url };
  }

  async initPhotoPost(payload: unknown): Promise<{ publishId: string }> {
    const data = await this.post<TikTokPhotoInitResponse>(
      "/v2/post/publish/content/init/",
      payload,
    );

    const publishId = data.publish_id;
    if (!publishId) {
      throw new WorkflowError("TikTok photo init response missing publish_id");
    }

    return { publishId };
  }

  async fetchPublishStatus(
    publishId: string,
  ): Promise<TikTokPublishStatusResult> {
    const data = await this.post<TikTokPublishStatusResponse>(
      "/v2/post/publish/status/fetch/",
      {
        publish_id: publishId,
      },
    );

    const dataRecord = data as unknown as Record<string, unknown>;
    const message = data.message || dataRecord?.["status_msg"];
    const failReason = data.fail_reason || dataRecord?.["fail_msg"];

    return {
      ...data,
      shareUrl: data.share_url,
      failReason: typeof failReason === "string" ? failReason : undefined,
      message: typeof message === "string" ? message : undefined,
    } satisfies TikTokPublishStatusResult;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, "https://open.tiktokapis.com");
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.ctx.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new WorkflowError(
        `Failed to call TikTok API ${path}: ${(error as Error).message}`,
      );
    }

    let json: TikTokAPIResponse<T>;
    try {
      json = (await response.json()) as TikTokAPIResponse<T>;
    } catch (error) {
      throw new WorkflowError(
        `TikTok API ${path} returned invalid JSON: ${(error as Error).message}`,
      );
    }

    const apiError = json.error;
    const successCode =
      apiError?.code === undefined ||
      apiError?.code === null ||
      apiError?.code === "ok" ||
      apiError?.code === "success" ||
      apiError?.code === 0;

    if (!response.ok || !successCode) {
      const message =
        apiError?.message || response.statusText || `TikTok API ${path} failed`;
      log.warn("tiktok api error", {
        path,
        status: response.status,
        errorCode: apiError?.code,
        errorMessage: apiError?.message,
        log_id: apiError?.log_id,
      });
      throw new WorkflowError(message);
    }

    if (!json.data) {
      throw new WorkflowError(`TikTok API ${path} returned empty data`);
    }

    return json.data;
  }
}
