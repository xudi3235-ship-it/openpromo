import type {
  UnifiedContentFacebookPost,
  UnifiedContentInstagramPost,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import { EntUnifiedContentBase } from "./base";
import { facebookGraphRequest, resolveFacebookIdentity } from "./facebook/api";

/**
 * app-level entity for Facebook posts. Internally it uses the unified content
 * entity. We wrap it this way to provide platform specific operations.
 */
export class EntFacebookPost extends EntUnifiedContentBase {
  private readonly log = Log.create({ namespace: "ent-facebook-post" });
  private readonly spec: FBFeedPlacementSpec;
  toJSON(): UnifiedContentFacebookPost {
    return this.data as UnifiedContentFacebookPost;
  }
  override fromUnifiedContent(data: UnifiedContentSelect): EntFacebookPost {
    return new EntFacebookPost(data);
  }

  constructor(data: UnifiedContentSelect) {
    super(data);
    const parsed = FBFeedPlacementSpec.safeParse(data.placementSpec);
    if (!parsed.success) {
      throw new Error(
        `unable to parse Facebook placementSpec for content ${data.id}: ${parsed.error.message}`,
      );
    }
    this.spec = parsed.data;
  }

  public async fromUnifiedContentID(id: string): Promise<EntFacebookPost> {
    return new EntFacebookPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    const postId = this.data.sourceContentId;
    if (!postId) {
      this.log.warn("skip facebook deletion, no sourceContentId", {
        contentId: this.data.id,
      });
      return;
    }

    const ctx = await resolveFacebookIdentity(this.spec);

    const graphPostId = postId.includes("_")
      ? postId
      : `${ctx.pageID}_${postId}`;

    const deletionResult = await facebookGraphRequest<
      { success?: boolean } | undefined
    >(ctx, `/${graphPostId}`, {
      method: "DELETE",
    });

    if (deletionResult && deletionResult.success !== true) {
      this.log.warn("facebook delete did not return success", {
        graphPostId,
        deletionResult,
      });
    }
  }

  public async _delete(): Promise<UnifiedContentFacebookPost> {
    return (await super._delete()) as UnifiedContentFacebookPost;
  }
}

export class EntInstagramPost extends EntUnifiedContentBase {
  private readonly log = Log.create({ namespace: "ent-instagram-post" });
  private readonly spec: IGFeedPlacementSpec;
  toJSON(): UnifiedContentInstagramPost {
    return this.data as UnifiedContentInstagramPost;
  }
  override fromUnifiedContent(data: UnifiedContentSelect): EntInstagramPost {
    return new EntInstagramPost(data);
  }

  constructor(data: UnifiedContentSelect) {
    super(data);
    const parsed = IGFeedPlacementSpec.safeParse(data.placementSpec);
    if (!parsed.success) {
      throw new Error(
        `unable to parse Instagram placementSpec for content ${data.id}: ${parsed.error.message}`,
      );
    }
    this.spec = parsed.data;
  }

  async fromUnifiedContentID(id: string): Promise<EntInstagramPost> {
    return new EntInstagramPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    this.spec;
    this.log.info("skip instagram deletion, not supported");
    // IG does not support deletion in api as of now
    return Promise.resolve();
  }
  public async _delete(): Promise<UnifiedContentInstagramPost> {
    return (await super._delete()) as UnifiedContentInstagramPost;
  }
}
