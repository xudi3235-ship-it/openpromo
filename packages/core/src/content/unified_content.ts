import z from "zod";
import { defineEvent } from "../event";
import { fn } from "../util/fn";
import { Actor } from "../actor";
import { afterTx, createTransaction } from "../drizzle/transaction";
import { createSelectSchema } from "drizzle-zod";
import { bus } from "sst/aws/bus";
import {
  unifiedContentTable,
  AllPlacement,
  PlacementSpec,
} from "./content.sql";
import { Resource } from "sst";
import { createID } from "../util/id";

export namespace UnifiedContent {
  export const Info = createSelectSchema(unifiedContentTable);

  export const Event = {
    Created: defineEvent(
      "unified_content.created",
      z.object({
        id: Info.shape.id,
      }),
    ),
    Updated: defineEvent(
      "unified_content.updated",
      z.object({
        id: Info.shape.id,
      }),
    ),
  };
  // crud
  export const create = fn(
    Info.omit({ id: true, workspaceID: true }),
    async (input) => {
      const id = createID("unified_content");
      // TODO: implement this
      const workspaceID = Actor.workspaceID();
      await createTransaction(async (tx) => {
        // Insert logic here
        await tx.insert(unifiedContentTable).values({
          id,
          workspaceID,
          placement: input.placement,
          sourceContent: input.sourceContent,
        });
        await afterTx(() => bus.publish(Resource.Bus, Event.Created, { id }));
      });
      return id;
    },
  );
  export const list = fn(
    z.object({
      workspaceID: z.string(),
    }),
    async ({ workspaceID }) => {
      // TODO: implement this
    },
  );

  function serialize(
    input: typeof unifiedContentTable.$inferInsert,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      pendingContentGroupId: input.pendingContentGroupId ?? null,
      workspaceID: input.workspaceID,
      placement: input.placement as z.infer<typeof AllPlacement>,
      sourceContent: input.sourceContent as any,
      status: input.status ?? "DRAFT",
      scheduledPublishAt: input.scheduledPublishAt ?? null,
      placement_spec: input.placement_spec as z.infer<typeof PlacementSpec>,
      timeCreated: input.timeCreated!,
      timeUpdated: input.timeUpdated!,
      timeDeleted: input.timeDeleted ?? null,
    };
  }
}
