import z from "zod";
import { defineEvent } from "../event";
import { fn } from "../util/fn";
import { Actor } from "../actor";
import {
  afterTx,
  createTransaction,
  Transaction,
} from "../drizzle/transaction";
import { bus } from "sst/aws/bus";
import { unifiedContentTable, UnifiedContentDTO } from "./content.sql";
import { Resource } from "sst";
import { createID } from "../util/id";
import { and, asc, desc, eq, getTableColumns } from "drizzle-orm";
import { scheduleEvent, updateScheduledEvent } from "../event/scheduler";
import { NotImplementedError } from "../error";
import { AllPlacement } from "./schema/placement";

export namespace UnifiedContent {
  export const Info = UnifiedContentDTO;

  export const Event = {
    Created: defineEvent(
      "unified_content.created",
      z.object({
        id: Info.shape.id,
      }),
    ),
    Updated: defineEvent("unified_content.updated", Info),
    Publish: defineEvent(
      "unified_content.publish",
      z.object({
        id: Info.shape.id,
        workspaceID: z.string(),
      }),
    ),
  };
  // crud
  export const create = fn(Info.omit({ id: true }), async (input) => {
    const id = createID("unified_content");
    const workspaceID = Actor.workspaceID();
    await createTransaction(async (tx) => {
      await tx.insert(unifiedContentTable).values({
        id,
        workspaceID,
        placement: input.placement,
        sourceContent: input.sourceContent,
      });
      await afterTx(() => bus.publish(Resource.Bus, Event.Created, { id }));
    });
    return id;
  });
  // update a content
  export const update = fn(Info, async (after) => {
    const workspaceID = Actor.workspaceID();
    return createTransaction(async (tx) => {
      const before = await tx
        .select(getTableColumns(unifiedContentTable))
        .from(unifiedContentTable)
        .where(
          and(
            eq(unifiedContentTable.id, after.id),
            eq(unifiedContentTable.workspaceID, workspaceID),
          ),
        )
        .then((rows) => rows[0]);
      if (!before) throw new Error(`Content with id ${after.id} not found`);
      await tx
        .update(unifiedContentTable)
        .set(after)
        .where(
          and(
            eq(unifiedContentTable.id, after.id),
            eq(unifiedContentTable.workspaceID, workspaceID),
          ),
        );
      // if there's a change in scheduled publish time, we need to reschedule
      if (after.scheduledPublishAt != null) {
        afterTx(
          async () =>
            await updateScheduledEvent(
              before.scheduleName!,
              UnifiedContent.Event.Publish,
              { id: after.id, workspaceID },
              after.scheduledPublishAt!,
            ),
        );
      }
    });
  });
  export const list = fn(
    z.object({
      workspaceID: z.string(),
      order: z.enum(["asc", "desc"]).optional(),
      cursor: z.number().optional(),
      pageSize: z.number().optional(),
    }),
    async ({ workspaceID, order, cursor, pageSize }) => {
      const pageSizeDefault = 20;
      return createTransaction(async (tx) => {
        const orderByClause = order === "asc" ? asc : desc;
        const results = await tx
          .select()
          .from(unifiedContentTable)
          .where(
            and(
              eq(unifiedContentTable.workspaceID, workspaceID),
              // TODO: handle cursor
            ),
          )
          .orderBy(orderByClause(unifiedContentTable.timeCreated))
          .limit(pageSize ?? pageSizeDefault);
        return results.map(serialize);
      });
    },
  );

  export const publish = fn(Info.pick({ id: true }), async (input) => {
    // TODO: core publishing logic, take the unified pending content
    // and publish it to the specific placement. This is invoked
    // for either, draft posts' publishing now, or scheduled posts' publishing
    // at the scheduled time.

    return createTransaction(async (tx) => {
      // Load the content to determine placement
      const content = await tx
        .select()
        .from(unifiedContentTable)
        .where(eq(unifiedContentTable.id, input.id))
        .then((rows) => rows[0]);

      if (!content) throw new Error(`Content with id ${input.id} not found`);

      switch (content.placement) {
        case AllPlacement.Enum.FB_FEED:
        // 1. let's implement the fb publisher
        case AllPlacement.Enum.FB_REEL:
        case AllPlacement.Enum.IG_FEED:
        case AllPlacement.Enum.IG_REEL:
          // const spec = content.placement_spec
          // TODO: transform this spec to sdk's format.
          throw new NotImplementedError();
        default:
          throw new Error(`Unsupported placement: ${content.placement}`);
      }
    });
  });

  function serialize(
    input: typeof unifiedContentTable.$inferInsert,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      workspaceID: input.workspaceID,
      timeCreated: input?.timeCreated!,
      timeUpdated: input?.timeUpdated!,
      pendingContentGroupId: input.pendingContentGroupId!,
      sourceContent: input.sourceContent!,
      placement_spec: input.placement_spec!,
      placement: input.placement,
      status: input.status!,
      scheduledPublishAt: input.scheduledPublishAt ?? undefined,
    };
  }
}

// --------- helpers ---------
async function publishToFacebookFeed(tx: Transaction, id: string) {
  // 1. load the unified content
  const content = await tx
    .select()
    .from(unifiedContentTable)
    .where(eq(unifiedContentTable.id, id))
    .then((rows) => rows.at(0));
  if (!content) throw new Error(`Content with id ${id} not found`);
  throw new NotImplementedError();
}
