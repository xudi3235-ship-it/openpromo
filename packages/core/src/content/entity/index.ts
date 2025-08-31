import z from "zod";
import { Actor } from "../../actor";
import { and, db, eq } from "../../drizzle";
import { afterTx, createTransaction } from "../../drizzle/transaction";
import { NotImplementedError } from "../../error";
import {
  PendingContentGroupInsert,
  type PendingContentGroupSelect,
  pendingContentGroupTable,
  type UnifiedContentFacebookPost,
  UnifiedContentInsert,
  type UnifiedContentInstagramPost,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "../../schema/content.sql";
import { fn } from "../../util/fn";

abstract class EntUnifiedContent {
  data: UnifiedContentSelect;
  constructor(data: UnifiedContentSelect) {
    this.data = data;
  }
  abstract toJSON(): UnifiedContentSelect;
  fromUnifiedContent(_data: UnifiedContentSelect): EntUnifiedContent {
    throw new NotImplementedError();
  }
  public async fromID(id: string): Promise<UnifiedContentSelect> {
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
    if (!post) throw new Error(`EntFacebookPost ${id} not found`);
    return post;
  }
  // Abstract method for platform-specific deletion
  protected abstract deleteSrc(): Promise<void>;
  public async delete(): Promise<UnifiedContentSelect> {
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
  // zod schema validated fn, low level api for creating a unified content
  public create = fn(
    UnifiedContentInsert.omit({
      workspaceId: true,
    }),
    async (input) => {
      const workspaceID = Actor.workspaceID();
      const [content] = await db()
        .insert(unifiedContentTable)
        .values({
          ...input,
          workspaceId: workspaceID,
        })
        .returning();
      return content;
    },
  );
}

/**
 * Entity representing a pending content group. A pending content group supports scheduling & drafts, containing N unified content.
 */
export class EntPendingContentGroup {
  data: PendingContentGroupSelect;

  constructor(data: PendingContentGroupSelect) {
    this.data = data;
  }
  public static getCreateSchema() {
    // schema used for creating a pending content group
    // i.e. schedule or draft.
    const schema = z.object({
      group: PendingContentGroupInsert.omit({ workspaceId: true }),
      contents: z.array(UnifiedContentInsert.omit({ workspaceId: true })),
    });
    return schema;
  }

  public static async fromID(id: string) {
    const workspaceID = Actor.workspaceID();
    const [group] = await db()
      .select()
      .from(pendingContentGroupTable)
      .where(
        and(
          eq(pendingContentGroupTable.id, id),
          eq(pendingContentGroupTable.workspaceId, workspaceID),
        ),
      )
      .limit(1);
    if (!group) throw new Error(`EntPendingContentGroup ${id} not found`);
    return new EntPendingContentGroup(group);
  }

  public async isScheduled(): Promise<boolean> {
    return this.data.publishingStatus === "SCHEDULED";
  }
  public async isDraft(): Promise<boolean> {
    return this.data.publishingStatus === "DRAFT";
  }
  public async delete(): Promise<PendingContentGroupSelect> {
    // 1. delete the pending group
    const workspaceID = Actor.workspaceID();
    return createTransaction(async (tx) => {
      const [deleted] = await tx
        .delete(pendingContentGroupTable)
        .where(
          and(
            eq(pendingContentGroupTable.id, this.data.id),
            eq(pendingContentGroupTable.workspaceId, workspaceID),
          ),
        )
        .returning();
      if (!deleted)
        throw new Error(`EntPendingContentGroup ${this.data.id} not found`);
      // 2. delete the linked drafts/scheduled contents
      const _contents = await tx
        .delete(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.pendingContentGroupId, this.data.id),
            eq(unifiedContentTable.workspaceId, workspaceID),
          ),
        )
        .returning();
      return deleted;
    });
  }
  /**
   * create a pending content group. Core action that powers scheduling
   * and draft. It will create a group as well as associated unified contents.(1..N)
   */
  public static create = fn(
    this.getCreateSchema(),
    async ({ group, contents }) => {
      const workspaceID = Actor.workspaceID();
      return createTransaction(async (tx) => {
        // 1. create pending content group
        const [pendingContentGroup] = await tx
          .insert(pendingContentGroupTable)
          .values({
            ...group,
            workspaceId: workspaceID,
          })
          .returning();
        if (!pendingContentGroup)
          throw new Error(`Failed to create pending content group`);
        const createdContents = [];
        // 2. create unified contents
        for (const content of contents) {
          const [unifiedContent] = await tx
            .insert(unifiedContentTable)
            .values({
              ...content,
              workspaceId: workspaceID,
              pendingContentGroupId: pendingContentGroup.id,
            })
            .returning();
          if (!unifiedContent)
            throw new Error(`Failed to create unified content`);
          createdContents.push(unifiedContent);
        }
        // 3. use scheduler to schedule publish events for each content
        // if they are scheduled.
        afterTx(() => {});
        return { pendingContentGroup, createdContents };
      });
    },
  );
}

/**
 * app-level entity for Facebook posts. Internally it uses the unified content
 * entity. We wrap it this way to provide platform specific operations.
 */
export class EntFacebookPost extends EntUnifiedContent {
  toJSON(): UnifiedContentFacebookPost {
    return this.data as UnifiedContentFacebookPost;
  }
  fromUnifiedContent(data: UnifiedContentSelect): EntFacebookPost {
    return new EntFacebookPost(data);
  }

  public async fromUnifiedContentID(id: string): Promise<EntFacebookPost> {
    return new EntFacebookPost(await super.fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError("Facebook post deletion not yet implemented");
  }

  public async delete(): Promise<UnifiedContentFacebookPost> {
    return (await super.delete()) as UnifiedContentFacebookPost;
  }
}

export class EntInstagramPost extends EntUnifiedContent {
  toJSON(): UnifiedContentInstagramPost {
    return this.data as UnifiedContentInstagramPost;
  }
  fromUnifiedContent(data: UnifiedContentSelect): EntInstagramPost {
    return new EntInstagramPost(data);
  }

  async fromUnifiedContentID(id: string): Promise<EntInstagramPost> {
    return new EntInstagramPost(await super.fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError(
      "Instagram post deletion not yet implemented",
    );
  }

  public async delete(): Promise<UnifiedContentInstagramPost> {
    return (await super.delete()) as UnifiedContentInstagramPost;
  }
}
