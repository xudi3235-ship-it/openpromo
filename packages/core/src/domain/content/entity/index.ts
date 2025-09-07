import type { WorkflowStep } from "cloudflare:workers";
import { nullThrows } from "@openpromo/js-shared/common";
import * as z from "zod";
import { stepWithActor } from "@/actors/workflow";
import { ConnectedAccount } from "@/domain/connected-account/connected-account";
import { NotImplementedError } from "@/error";
import {
  afterTx,
  and,
  createTransaction,
  db,
  eq,
  useTransaction,
} from "@/helpers/db";
import {
  PendingContentGroupInsert,
  type PendingContentGroupSelect,
  pendingContentGroupTable,
  type UnifiedContentFacebookPost,
  UnifiedContentInsert,
  type UnifiedContentInstagramPost,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@/schemas/content.sql";
import { fn } from "@/utils/fn";
import { Actor } from "../../../actor";
import { Binding } from "../../../actors";
import { defineEvent } from "../../../event";
import { type AllPlacement, FBFeedPlacementSpec } from "../schema/placement";

abstract class EntUnifiedContentBase {
  data: UnifiedContentSelect;
  constructor(data: UnifiedContentSelect) {
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
    console.log("// post: " + post);
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
}

class EntPendingContent extends EntUnifiedContentBase {
  protected deleteSrc(): Promise<void> {
    // noop.
    return Promise.resolve();
  }
  override isPublished(): boolean {
    return false; // not possible
  }
  static async fromID(id: string): Promise<EntPendingContent> {
    return new EntPendingContent(await EntUnifiedContentBase._fromID(id));
  }
  static fromUnifiedContent(data: UnifiedContentSelect): EntUnifiedContentBase {
    return new EntPendingContent(data);
  }
  toScheduledContent(): EntScheduledContent {
    return new EntScheduledContent(this.data);
  }
  static async _createDummy(): Promise<EntPendingContent> {
    const acc = await ConnectedAccount._createDummy();
    const content = await EntPendingContent.create({
      placement: "FB_FEED",
      connectedAccountId: acc.id,
      publishingStatus: "SCHEDULED",
      placementSpec: {
        identity: {
          pageId: acc.externalAccountId,
          userId: "dummy_user_id",
        },
        actor: Actor.assert("workspace_user"),
        placement: "FB_FEED",
        postSpec: {
          message: "This is a dummy scheduled post",
        },
      },
      schedulingSpec: {
        scheduledPublishAt: new Date(Date.now() + 5 * 1000), // 5 seconds later
      },
    });
    return new EntPendingContent(content);
  }
}

class EntScheduledContent extends EntPendingContent {
  constructor(data: UnifiedContentSelect) {
    super(data);
    if (!this.isScheduled()) {
      throw new Error(`Content ${data.id} is not scheduled`);
    }
    const spec = this.data.schedulingSpec;
    if (!spec?.scheduledPublishAt) {
      throw new Error(`Content ${this.data.id} missing schedulingSpec`);
    }
  }
  public getScheduledAt(): Date {
    const spec = nullThrows(this.data.schedulingSpec);
    return spec.scheduledPublishAt;
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
    return new EntFacebookPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError("Facebook post deletion not yet implemented");
  }

  public async _delete(): Promise<UnifiedContentFacebookPost> {
    return (await super._delete()) as UnifiedContentFacebookPost;
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
    return new EntInstagramPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError(
      "Instagram post deletion not yet implemented",
    );
  }

  public async _delete(): Promise<UnifiedContentInstagramPost> {
    return (await super._delete()) as UnifiedContentInstagramPost;
  }
}

// ================== publishers ==================

// TODO: make this a base / abstract class
// delegate platform logics for each platform/placement's publisher
// e.g. FacebookPostPublisher, InstagramReelPublisher, etc?
abstract class PendingContentPublisher {
  protected content: EntPendingContent;

  constructor(content: EntPendingContent) {
    this.content = content;
  }
  static fromPendingContent(content: EntPendingContent) {
    switch (content.placement()) {
      case "FB_FEED":
        return new FacebookPostPublisher(content);
      case "IG_FEED":
        return new InstagramPostPublisher(content);
      default:
        throw new NotImplementedError(
          `No publisher for placement ${content.placement()}`,
        );
    }
  }
  static async fromPendingContentID(id: string) {
    return EntPendingContent.fromID(id).then((content) =>
      PendingContentPublisher.fromPendingContent(content),
    );
  }
  abstract placement(): AllPlacement | AllPlacement[];
  abstract publish(step: WorkflowStep): Promise<void>;
}

class FacebookPostPublisher extends PendingContentPublisher {
  spec: FBFeedPlacementSpec;
  constructor(content: EntPendingContent) {
    super(content);
    if (content.placement() !== "FB_FEED") {
      throw new Error(
        `Content ${content.data.id} is not a Facebook post, cannot create FacebookPostPublisher`,
      );
    }
    const { data, success, error } = FBFeedPlacementSpec.safeParse(
      content.data.placementSpec,
    );
    if (!data || !success) {
      console.error(error);
    }
    // @ts-expect-error fix this type
    this.spec = data;
  }

  placement() {
    return "FB_FEED" as AllPlacement;
  }
  async publish(step: WorkflowStep): Promise<void> {
    // in the publisher, each step STILL needs to be wrapped
    // in actor context.
    // await stepWithPublisher(step, "publish text post",actor,  )
    await step.do("foo", async () => {
      console.log("bar");
    });
    await step.do("publish to FB", async () => {
      console.log("publishing to FB...");
    });
    await stepWithActor(
      step,
      "nested actor step",
      Actor.assert("workspace_user"),
      async () => {
        console.log("inside nested actor step");
      },
    );
    throw new NotImplementedError();
  }
}

class InstagramPostPublisher extends PendingContentPublisher {
  constructor(content: EntPendingContent) {
    super(content);
    if (content.placement() !== "IG_FEED") {
      throw new Error(
        `Content ${content.data.id} is not an Instagram post, cannot create InstagramPostPublisher`,
      );
    }
  }
  placement() {
    return "IG_FEED" as AllPlacement;
  }
  async publish(step: WorkflowStep): Promise<void> {
    await step.do("foo", async () => {
      console.log("bar");
    });
    throw new NotImplementedError();
  }
}

// ================== exports ==================
export {
  EntPendingContent,
  EntPendingContentGroup,
  EntScheduledContent,
  FacebookPostPublisher,
  InstagramPostPublisher,
  PendingContentPublisher,
};
