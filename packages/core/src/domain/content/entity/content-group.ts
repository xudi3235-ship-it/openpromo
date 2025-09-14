import { defineEvent } from "@core/experimental/event";
import { Actor } from "@core/helpers/actor";
import { afterTx, and, createTransaction, db, eq } from "@core/helpers/db";
import {
  PendingContentGroupInsert,
  type PendingContentGroupSelect,
  pendingContentGroupTable,
  UnifiedContentInsert,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { NotImplementedError } from "@core/utils/error";
import { fn } from "@core/utils/fn";
import * as z from "zod";
import { EntPendingContent } from "./pending-content";

/**
 * Entity representing a pending content group. A pending content group supports scheduling & drafts, containing N unified content.
 */
export class EntPendingContentGroup {
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
  static async deleteByID(id: string) {
    const workspaceID = Actor.workspaceID();
    return createTransaction(async (tx) => {
      // 1. First, delete the linked drafts/scheduled contents (foreign key dependencies)
      const contents = await tx
        .delete(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.pendingContentGroupId, id),
            eq(unifiedContentTable.workspaceId, workspaceID),
          ),
        )
        .returning();

      // 2. Then, delete the group (no more foreign key constraints)
      const [deleted] = await tx
        .delete(pendingContentGroupTable)
        .where(
          and(
            eq(pendingContentGroupTable.id, id),
            eq(pendingContentGroupTable.workspaceId, workspaceID),
          ),
        )
        .returning();
      if (!deleted) throw new Error(`EntPendingContentGroup ${id} not found`);
      afterTx(async () => {
        // TODO: terminate workflows for each content
        await Promise.all(
          contents.map((c) => EntPendingContent.killWorkflow(c.id)),
        );
      });
      return deleted;
    });
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
          // TODO: implement scheduling logic
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
    const workspaceID = Actor.workspaceID();
    return createTransaction(async (tx) => {
      // 1. First, delete the linked drafts/scheduled contents (foreign key dependencies)
      await tx
        .delete(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.pendingContentGroupId, this.data.id),
            eq(unifiedContentTable.workspaceId, workspaceID),
          ),
        )
        .returning();

      // 2. Then, delete the group (no more foreign key constraints)
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
