import { eq } from "drizzle-orm";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import z from "zod";
import { Common } from "../common";
import { afterTx, createTransaction } from "../drizzle/transaction";
import { defineEvent } from "../event";
import { Examples } from "../examples";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { workspaceTable } from "./workspace.sql";

export namespace Workspace {
  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.Workspace.id,
      }),
      slug: z.string().openapi({
        description: "Slug of the workspace.",
        example: Examples.Workspace.slug,
      }),
    })
    .openapi({
      ref: "Workspace",
      description: "A Workspace object.",
      example: Examples.Workspace,
    });

  export const Event = {
    Created: defineEvent(
      "workspace.created",
      z.object({
        workspaceID: Info.shape.id,
      }),
    ),
  };

  // operations
  export const create = fn(Info.shape.slug, async (slug) => {
    const id = createID("workspace");
    await createTransaction(async (tx) => {
      await afterTx(() =>
        bus.publish(Resource.Bus, Event.Created, { workspaceID: id }),
      );
      await tx.insert(workspaceTable).values({
        id,
        slug,
      });
    });
    return id;
  });

  export const update = fn(
    Info.pick({ id: true, slug: true }),
    async (input) => {
      await createTransaction(async (tx) => {
        await tx
          .update(workspaceTable)
          .set({
            slug: input.slug,
          })
          .where(eq(workspaceTable.id, input.id));
      });
    },
  );

  export const deleteWorkspace = fn(Info.shape.id, async (id) =>
    createTransaction(async (tx) => {
      await tx.delete(workspaceTable).where(eq(workspaceTable.id, id));
    }),
  );
}
