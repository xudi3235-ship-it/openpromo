import { and, db, eq } from "@core/database/db";
import { afterTx, useTransaction } from "@core/database/transaction";
import { Actor } from "@core/helpers/actor";
import { Ent } from "@core/helpers/ent";
import {
  type AllPlacement,
  AllPlacement as AllPlacementEnum,
  pendingContentGroupTable,
  UnifiedContentInsert,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { NotImplementedError } from "@core/utils/error";
import { fn } from "@core/utils/fn";

export abstract class EntUnifiedContentBase extends Ent<UnifiedContentSelect> {
  static type = "unified_content";

  data: UnifiedContentSelect;
  constructor(data: UnifiedContentSelect) {
    super(data);
    this.data = data;
  }
  toJSON() {
    return this.data;
  }
  static Schemas() {
    return {
      create: UnifiedContentInsert.omit({
        workspaceId: true,
      }),
    };
  }
  fromUnifiedContent(_data: UnifiedContentSelect): EntUnifiedContentBase {
    throw new NotImplementedError();
  }
  /**
   * creates a piece of unified content.
   * 1. backfilled from source plat.
   * 2. scheduled, handle scheduling.
   * 3. drafts
   */
  static create = fn(this.Schemas().create, async (input) => {
    const workspaceID = Actor.workspaceID();
    return useTransaction(async (tx) => {
      const [content] = await tx
        .insert(unifiedContentTable)
        .values({
          ...input,
          workspaceId: workspaceID,
        })
        .returning();
      await afterTx(async () => {
        // TODO: handle side effects
      });
      return content;
    });
  });
  static createMany = fn(this.Schemas().create.array(), async (inputArray) => {
    return inputArray.map(async (input) => this.create(input));
  });
  public static async _fromID(id: string): Promise<UnifiedContentSelect> {
    const workspaceID = Actor.workspaceID();
    const [post] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.id, id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      )
      .limit(1);
    if (!post) throw new Error(`UnifiedContent ${id} not found`);
    return post;
  }
  // Abstract method for platform-specific deletion
  protected abstract deleteSrc(): Promise<void>;
  public async _delete(): Promise<UnifiedContentSelect> {
    // TODO: how do we enforce consistency here??
    const workspaceID = Actor.workspaceID();

    // If content is published, delete from platform first
    if (this.isPublished()) {
      await this.deleteSrc();
    }

    // Then delete from our database
    const [deleted] = await db()
      .delete(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.id, this.data.id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      )
      .returning();

    if (!deleted) throw new Error(`Content ${this.data.id} not found`);
    return deleted;
  }
  public isScheduled(): boolean {
    return this.data.publishingStatus === "SCHEDULED";
  }
  public isDraft(): boolean {
    return this.data.publishingStatus === "DRAFT";
  }
  public isPublished(): boolean {
    return this.data.publishingStatus === "PUBLISHED";
  }
  public async toPendingPublishGroup() {
    const workspaceID = Actor.workspaceID();
    const linkedGroupId = this.data.pendingContentGroupId;
    // not a scheduled or draft
    if (!linkedGroupId) {
      throw new Error(
        `Content ${this.data.id} is not in a pending publish group`,
      );
    }
    const [g] = await db()
      .select()
      .from(pendingContentGroupTable)
      .where(
        and(
          eq(pendingContentGroupTable.workspaceId, workspaceID),
          eq(pendingContentGroupTable.id, linkedGroupId),
        ),
      )
      .limit(1);
    return g;
  }
  public placement(): AllPlacement {
    return this.data.placement;
  }
  // TODO: i wanna use this to be dynamically cast to subclass
  async to(ent: EntUnifiedContentBase): Promise<EntUnifiedContentBase> {
    return ent.fromUnifiedContent(this.data);
  }
}

export class EntUnifiedContent extends EntUnifiedContentBase {
  static override type = "unified_content";
  protected async deleteSrc(): Promise<void> {}
  static async fromID(id: string): Promise<EntUnifiedContent> {
    return EntUnifiedContentBase._fromID(id).then(
      (data) => new EntUnifiedContent(data),
    );
  }
  async delete(): Promise<UnifiedContentSelect> {
    const placement = this.placement();
    const { EntPendingContent } = await import("./EntContent");
    const pendingAdapter = new EntPendingContent(this.data);
    await pendingAdapter.deleteLocalAttachmentAssets();

    if (this.isPublished()) {
      switch (placement) {
        case AllPlacementEnum.FB_FEED: {
          const { EntFacebookPost } = await import("./EntPlatformPosts");
          const post = new EntFacebookPost(this.data);
          return await post._delete();
        }
        case AllPlacementEnum.IG_FEED: {
          const { EntInstagramPost } = await import("./EntPlatformPosts");
          const post = new EntInstagramPost(this.data);
          return await post._delete();
        }
        case AllPlacementEnum.TT_FEED: {
          const { EntTikTokPost } = await import("./EntPlatformPosts");
          const post = new EntTikTokPost(this.data);
          return await post._delete();
        }
        default:
          return await this._delete();
      }
    }

    await EntPendingContent.killWorkflow(this.data.id);

    switch (placement) {
      case AllPlacementEnum.FB_FEED: {
        const { EntFBFeedPendingContent } = await import("./EntFacebookFeed");
        const pending = new EntFBFeedPendingContent(this.data);
        return await pending._delete();
      }
      case AllPlacementEnum.IG_FEED: {
        const { EntIGFeedPendingContent } = await import("./EntInstagramFeed");
        const pending = new EntIGFeedPendingContent(this.data);
        return await pending._delete();
      }
      default:
        return await this._delete();
    }
  }
}
