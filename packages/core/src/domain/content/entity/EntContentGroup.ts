import { and, db, eq } from "@core/database/db";
import { afterTx, createTransaction } from "@core/database/transaction";
import { defineEvent } from "@core/experimental/event";
import { Actor } from "@core/helpers/actor";
import {
  PendingContentGroupInsert,
  type PendingContentGroupSelect,
  pendingContentGroupTable,
  UnifiedContentInsert,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { NotImplementedError } from "@core/utils/error";
import { fn } from "@core/utils/fn";
import * as z from "zod";
import { EntPendingContent } from "./EntContent";

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

        // 3. Initialize metadata after transaction commits
        await afterTx(async () => {
          // Initialize attachment metadata for all contents
          await Promise.all(
            unifiedContents.map(async (content) => {
              const ent = new EntPendingContent(content);
              await ent.initializeAttachmentMetadata();
            }),
          );
        });

        return { pendingContentGroup, unifiedContents };
      });
    },
  );

  public static async createWithWorkflows(
    input: z.infer<
      ReturnType<(typeof EntPendingContentGroup)["Schemas"]>["create"]
    >,
    onAfterCommit: (contentIds: string[]) => Promise<void>,
  ) {
    const result = await EntPendingContentGroup.create(input);

    try {
      // Run workflow creation after transaction has committed
      await onAfterCommit(result.unifiedContents.map((c) => c.id));
      return result;
    } catch (error) {
      // COMPENSATION: Workflow creation failed, rollback DB changes
      console.error(
        "Workflow creation failed, rolling back content group",
        error,
      );
      try {
        const group = new EntPendingContentGroup(result.pendingContentGroup);
        await group.delete();
      } catch (deleteError) {
        console.error(
          "Failed to rollback content group after workflow failure",
          deleteError,
        );
      }
      // Re-throw the original error
      throw error;
    }
  }
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

  /**
   * Checks if all contents in the group have failed to publish.
   * If so, marks the group as FAILED_TO_PUBLISH.
   *
   * @returns Object with status info: { allFailed: boolean, failedCount: number, totalCount: number, groupUpdated: boolean }
   */
  public async checkAndMarkGroupFailureIfNeeded(): Promise<{
    allFailed: boolean;
    failedCount: number;
    totalCount: number;
    groupUpdated: boolean;
  }> {
    const workspaceID = Actor.workspaceID();

    // Get all contents in the group
    const allContents = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.pendingContentGroupId, this.data.id),
          eq(unifiedContentTable.workspaceId, workspaceID),
        ),
      );

    const totalCount = allContents.length;
    const failedCount = allContents.filter(
      (content) => content.publishingStatus === "FAILED_TO_PUBLISH",
    ).length;
    const allFailed = failedCount === totalCount && totalCount > 0;

    let groupUpdated = false;

    if (allFailed) {
      // All contents have failed, mark the group as failed
      const [updatedGroup] = await db()
        .update(pendingContentGroupTable)
        .set({
          publishingStatus: "FAILED_TO_PUBLISH",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pendingContentGroupTable.id, this.data.id),
            eq(pendingContentGroupTable.workspaceId, workspaceID),
          ),
        )
        .returning();

      if (updatedGroup) {
        this.data = updatedGroup;
        groupUpdated = true;
      }
    }

    return {
      allFailed,
      failedCount,
      totalCount,
      groupUpdated,
    };
  }

  /**
   * Static helper to check and mark group failure for a given group ID.
   * Useful when you only have the group ID and don't want to instantiate the entity first.
   */
  public static async checkAndMarkGroupFailureByID(groupID: string): Promise<{
    allFailed: boolean;
    failedCount: number;
    totalCount: number;
    groupUpdated: boolean;
  } | null> {
    try {
      const group = await EntPendingContentGroup.fromID(groupID);
      return await group.checkAndMarkGroupFailureIfNeeded();
    } catch (error) {
      console.error(
        `Failed to check group failure for group ${groupID}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Updates the group metadata and replaces all contents atomically.
   * Terminates old workflows and creates new ones.
   */
  public async updateWithContents(
    groupUpdate: Partial<
      Pick<
        PendingContentGroupInsert,
        "publishingStatus" | "pendingContentGroupSpec"
      >
    >,
    newContents: Array<
      Omit<UnifiedContentInsert, "workspaceId" | "pendingContentGroupId">
    >,
  ): Promise<{
    group: PendingContentGroupSelect;
    contents: UnifiedContentSelect[];
  }> {
    const workspaceID = Actor.workspaceID();

    return createTransaction(async (tx) => {
      // 1. Update the group
      const [updatedGroup] = await tx
        .update(pendingContentGroupTable)
        .set({
          ...groupUpdate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pendingContentGroupTable.id, this.data.id),
            eq(pendingContentGroupTable.workspaceId, workspaceID),
          ),
        )
        .returning();

      if (!updatedGroup) {
        throw new Error(`EntPendingContentGroup ${this.data.id} not found`);
      }

      // 2. Get existing content IDs for workflow termination
      const existingContents = await tx
        .select({ id: unifiedContentTable.id })
        .from(unifiedContentTable)
        .where(eq(unifiedContentTable.pendingContentGroupId, this.data.id));

      // 3. Delete existing contents
      await tx
        .delete(unifiedContentTable)
        .where(eq(unifiedContentTable.pendingContentGroupId, this.data.id));

      // 4. Insert new contents
      const insertedContents = await tx
        .insert(unifiedContentTable)
        .values(
          newContents.map((content) => ({
            ...content,
            workspaceId: workspaceID,
            pendingContentGroupId: this.data.id,
          })),
        )
        .returning();

      // 5. Handle workflows after transaction
      await afterTx(async () => {
        // Terminate old workflows
        await Promise.allSettled(
          existingContents.map((c) => EntPendingContent.killWorkflow(c.id)),
        );

        // Initialize metadata for new contents
        await Promise.all(
          insertedContents.map(async (content) => {
            const pending = new EntPendingContent(content);
            await pending.initializeAttachmentMetadata();
          }),
        );
      });

      return { group: updatedGroup, contents: insertedContents };
    });
  }

  /**
   * Update with compensation pattern: if workflow creation fails,
   * we cannot fully rollback the update (old contents already deleted),
   * but we can delete the new contents to leave the group empty.
   * This provides best-effort atomicity.
   *
   * @param onAfterCommit - Callback to run after transaction commits (e.g., workflow creation)
   */
  public async updateWithContentsAndWorkflows(
    groupUpdate: Partial<
      Pick<
        PendingContentGroupInsert,
        "publishingStatus" | "pendingContentGroupSpec"
      >
    >,
    newContents: Array<
      Omit<UnifiedContentInsert, "workspaceId" | "pendingContentGroupId">
    >,
    onAfterCommit: (contentIds: string[]) => Promise<void>,
  ): Promise<{
    group: PendingContentGroupSelect;
    contents: UnifiedContentSelect[];
  }> {
    const result = await this.updateWithContents(groupUpdate, newContents);

    try {
      // Run workflow creation after transaction has committed
      await onAfterCommit(result.contents.map((c) => c.id));
      return result;
    } catch (error) {
      // COMPENSATION: Workflow creation failed, delete new contents
      // Note: old contents already deleted by updateWithContents, cannot be restored
      console.error("Workflow creation failed, deleting new contents", error);
      try {
        const workspaceID = Actor.workspaceID();
        await db()
          .delete(unifiedContentTable)
          .where(
            and(
              eq(unifiedContentTable.workspaceId, workspaceID),
              eq(unifiedContentTable.pendingContentGroupId, this.data.id),
            ),
          );
      } catch (deleteError) {
        console.error(
          "Failed to delete new contents after workflow failure",
          deleteError,
        );
      }
      // Re-throw the original error
      throw error;
    }
  }
}
