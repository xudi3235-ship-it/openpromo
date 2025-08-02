import z from "zod";
import { Common } from "../common";
import { Examples } from "../examples";
import { defineEvent } from "../event";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import {
  createTransaction,
  afterTx,
  Transaction,
} from "../drizzle/transaction";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import {
  unifiedContentTable,
  pendingContentGroupTable,
  PendingContentGroupDTO,
} from "./content.sql";
import { Actor } from "../actor";
import { eq, getTableColumns } from "../drizzle";
import { scheduleEvent } from "../event/scheduler";
import { UnifiedContent } from "./unified_content";
import { AllPlacement, PlacementSpecMapping } from "./schema/placement";
import { NotImplementedError } from "../error";

export namespace PendingContentGroup {
  export const Info = PendingContentGroupDTO;

  export const Event = {
    Created: defineEvent(
      "pending_content_group.created",
      z.object({
        id: Info.shape.id,
      }),
    ),
    Updated: defineEvent(
      "pending_content_group.updated",
      z.object({
        id: Info.shape.id,
      }),
    ),
  };

  // create a pending group w/ unified contents, for drafts & scheduled
  export const createWithUnifiedContents = fn(
    Info.omit({ id: true, workspaceID: true }).extend({
      placementSpecs: PlacementSpecMapping,
    }),
    async (input) => {
      const pending_content_group_id = createID("content_group");
      const workspaceID = Actor.workspaceID();
      await createTransaction(async (tx) => {
        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, {
            id: pending_content_group_id,
          }),
        );
        // 1. create base content entry
        await tx.insert(pendingContentGroupTable).values({
          id: pending_content_group_id,
          workspaceID,
          baseSpec: input.baseSpec,
        });
        // 2. placement specific entries
        await createPendingContents(
          tx,
          input.placementSpecs,
          pending_content_group_id,
        );
      });
      return pending_content_group_id;
    },
  );

  export const list = fn(
    z.object({
      workspaceID: z.string(),
    }),
    async (input) => {
      const { workspaceID } = input;
      return createTransaction(async (tx) => {
        const results = await tx
          .select(getTableColumns(pendingContentGroupTable))
          .from(pendingContentGroupTable)
          .where(eq(pendingContentGroupTable.workspaceID, workspaceID));
        return results.map(serialize);
      });
    },
  );

  function serialize(
    input: typeof pendingContentGroupTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      workspaceID: input.workspaceID,
      timeCreated: input.timeCreated,
      timeUpdated: input.timeUpdated,
      baseSpec: input.baseSpec as any, // TODO: refine this type
    };
  }
}

// ------ helpers ------
async function createPendingContents(
  tx: Transaction,
  placementSpecs: PlacementSpecMapping,
  pendingContentGroupId: string,
) {
  const workspaceID = Actor.workspaceID();

  for (const [placement, spec] of Object.entries(placementSpecs)) {
    if (!spec) continue;
    const id = createID("unified_content");
    const scheduledPublishAt = spec.timeSpec?.scheduledPublishAt;

    // Store schedule name if scheduling is needed
    let scheduleName: string | null = null;
    if (scheduledPublishAt) scheduleName = `publish-${id}-${workspaceID}`;
    // TODO: we need to check for the each placement spec's identity
    // and verify it's on the connected account table
    await tx.insert(unifiedContentTable).values({
      id,
      workspaceID,
      connectedAccountId: "FIXME: FIGURE THIS OUT",
      pendingContentGroupId,
      placement_spec: spec,
      placement: placement as keyof typeof AllPlacement.enum,
      scheduledPublishAt,
      scheduleName, // schedule name
    });

    if (!scheduledPublishAt || !scheduleName) continue;

    // Use afterTx for scheduling
    afterTx(async () => {
      await scheduleEvent(
        UnifiedContent.Event.Publish,
        {
          id,
          workspaceID,
        },
        scheduledPublishAt,
        {
          scheduleName,
        },
      );
    });
  }
}
