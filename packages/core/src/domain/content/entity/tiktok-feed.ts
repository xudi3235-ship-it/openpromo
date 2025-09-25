import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import {
  TikTokFeedPlacementSpec,
  TikTokPlacement,
} from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { WorkflowError } from "@core/utils/error";
import { EntPendingContent } from "./pending-content";

export interface TikTokIdentityContext {
  accessToken: string;
  refreshToken?: string | null;
  tiktokUserID: string;
  connectedAccountID: string;
}

export class EntTikTokFeedPendingContent extends EntPendingContent {
  static type = "tiktok_pending_content";
  spec: TikTokFeedPlacementSpec;
  tiktokUserID: string;

  constructor(data: UnifiedContentSelect) {
    super(data);
    const placement = this.placement();
    if (placement !== TikTokPlacement.TIKTOK_FEED) {
      throw new WorkflowError(
        `Content ${data.id} is not TIKTOK_FEED placement, got ${placement}`,
      );
    }

    const parsed = TikTokFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!parsed.success) {
      throw new WorkflowError(
        `invalid TikTokFeedPlacementSpec for content ${data.id}: ${parsed.error.message}`,
      );
    }

    if (!parsed.data.identity.tiktokUserID) {
      throw new WorkflowError(
        `TikTok placement spec missing tiktokUserID for content ${data.id}`,
      );
    }

    this.spec = parsed.data;
    this.tiktokUserID = parsed.data.identity.tiktokUserID;
  }

  static async fromID(id: string): Promise<EntTikTokFeedPendingContent> {
    return EntTikTokFeedPendingContent.fromPendingContent(
      await EntPendingContent.fromID(id),
    );
  }

  static fromPendingContent(
    pendingContent: EntPendingContent,
  ): EntTikTokFeedPendingContent {
    return new EntTikTokFeedPendingContent(pendingContent.data);
  }

  caption(): string | undefined {
    return this.spec.caption ?? undefined;
  }

  ensureSingleVideoAttachment() {
    const videos = this.videoAttachments();
    if (videos.length !== 1) {
      throw new WorkflowError(
        `TikTok feed currently supports exactly one video attachment, found ${videos.length}`,
      );
    }
    return onlyOrThrow(videos);
  }

  async identity(): Promise<TikTokIdentityContext> {
    const account = await ConnectedAccount.fromTikTokAccountID(
      this.tiktokUserID,
    );
    if (!account) {
      throw new WorkflowError(
        `connected account not found for TikTok user ${this.tiktokUserID}`,
      );
    }

    return {
      accessToken: account.encryptedAccessToken,
      refreshToken: account.refreshToken,
      tiktokUserID: this.tiktokUserID,
      connectedAccountID: account.id,
    } satisfies TikTokIdentityContext;
  }

  logContext() {
    return {
      contentId: this.data.id,
      tiktokUserID: this.tiktokUserID,
      connectedAccountID: this.spec.identity.connectedAccountID,
    };
  }

  assertReadyForPublishing() {
    const hasVideo = this.hasVideoAttachment();
    if (!hasVideo) {
      throw new WorkflowError(
        `TikTok feed content ${this.data.id} must include a video attachment`,
      );
    }
    this.ensureSingleVideoAttachment();
  }
}
