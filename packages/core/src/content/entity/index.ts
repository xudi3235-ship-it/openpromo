import * as z from "zod";
import { Actor } from "../../actor";
import { Binding } from "../../actors";
import { and, db, eq } from "../../drizzle";
import {
  afterTx,
  createTransaction,
  useTransaction,
} from "../../drizzle/transaction";
import { NotImplementedError } from "../../error";
import { defineEvent } from "../../event";
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

abstract class EntUnifiedContentBase {
  data: UnifiedContentSelect;
  constructor(data: UnifiedContentSelect) {
    this.data = data;
  }
  abstract toJSON(): UnifiedContentSelect;
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
}

class EntPendingContent extends EntUnifiedContentBase {
  toJSON(): UnifiedContentSelect {
    return this.data;
  }
  protected deleteSrc(): Promise<void> {
    // noop.
    return Promise.resolve();
  }
}

/**
 * Entity representing a pending content group. A pending content group supports scheduling & drafts, containing N unified content.
 */
class EntPendingContentGroup {
  data: PendingContentGroupSelect;

  constructor(data: PendingContentGroupSelect) {
    this.data = data;
  }
  // ================== static ==================
  static Events() {
    return {
      // each content will have separate events for publish now
      Publish: defineEvent(
        "pending_content_group.publish",
        z.object({
          groupID: z.string(),
          contentID: z.string(),
        }),
      ),
      Scheduled: defineEvent(
        "pending_content_group.scheduled",
        z.object({
          groupID: z.string(),
          contentID: z.string(),
          scheduleName: z.string(),
          scheduleArn: z.string(),
        }),
      ),
    };
  }
  static Schemas() {
    // zod schemas
    const create = z.object({
      group: PendingContentGroupInsert.omit({ workspaceId: true }),
      contents: z.array(UnifiedContentInsert.omit({ workspaceId: true })),
    });
    return {
      create,
    };
  }
  public static async list() {
    throw new NotImplementedError(
      "paginated query for pending content groups.",
    );
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
  /**
   * create a pending content group. Core action that powers scheduling
   * and draft. It will create a group as well as associated unified contents.(1..N)
   */
  public static create = fn(
    this.Schemas().create,
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
        // 2. create unified contents
        const unifiedContents = await tx
          .insert(unifiedContentTable)
          .values(
            contents.map((content) => ({
              ...content,
              workspaceId: workspaceID,
              pendingContentGroupId: pendingContentGroup.id,
            })),
          )
          .returning();

        // 3. handle scheduled contents
        await afterTx(async () => {
          Binding.getScheduler();
          unifiedContents.map(async (content) => {
            const spec = content.schedulingSpec;
            // not a scheduled content, skip
            if (!spec?.scheduledPublishAt) return;
            // TODO: implement scheduling logic
          });
        });
        return { pendingContentGroup, unifiedContents };
      });
    },
  );
  // ================== cls methods ==================

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
      await tx
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
  public async getContents(): Promise<EntPendingContent[]> {
    const workspaceID = Actor.workspaceID();
    const contents = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.pendingContentGroupId, this.data.id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      );
    return contents.map((content) => new EntPendingContent(content));
  }
}

/**
 * app-level entity for Facebook posts. Internally it uses the unified content
 * entity. We wrap it this way to provide platform specific operations.
 */
export class EntFacebookPost extends EntUnifiedContentBase {
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

export class EntInstagramPost extends EntUnifiedContentBase {
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

// ================== publishers ==================

/**
 * publisher for scheduled contents / drafts.
 */
class PendingContentGroupPublisher {
  private group: EntPendingContentGroup;

  constructor(group: EntPendingContentGroup) {
    this.group = group;
  }
  public async publish() {
    const contents = await this.group.getContents();
    for (const content of contents) {
      await new PendingContentPublisher(content).publish();
    }
  }
}

// TODO: make this a base / abstract class
// delegate platform logics for each platform/placement's publisher
// e.g. FacebookPostPublisher, InstagramReelPublisher, etc?
class PendingContentPublisher {
  private content: EntPendingContent;

  constructor(content: EntPendingContent) {
    this.content = content;
  }
  /**
   * heart of publishing a pending content. This api is called for both
   * scheduled and draft contents.
   * We will do a tons of transformations + api calls here.
   * 1. we read the placement specc, e.g. is this FB post? IG reel? etc.
   * 2. we validate the content against the platform's requirements.
   * 3. transform the publishing steps for sequence of api calls. E.g. for video uploading first.
   * 4. execute the api calls.
   * 5. update the content status, e.g. to published, or failed.
   * 6. handle any side effects, e.g. notifications, webhooks, etc.
   */
  public async publish() {
    console.log("publishing content", this.content.data.id);
    throw new NotImplementedError();
  }
}

// ================== exports ==================
export {
  EntPendingContent,
  EntPendingContentGroup,
  PendingContentGroupPublisher,
};
