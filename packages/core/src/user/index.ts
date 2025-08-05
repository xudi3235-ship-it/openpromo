import { and, asc, eq, getTableColumns, inArray, isNull } from "drizzle-orm";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import z from "zod";
import { Actor } from "../actor";
import { Common } from "../common";
import {
  afterTx,
  createTransaction,
  useTransaction,
} from "../drizzle/transaction";
import { defineEvent } from "../event";
import { Examples } from "../examples";
import { stripe } from "../stripe";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { workspaceTable } from "../workspace/workspace.sql";
import { userTable } from "./user.sql";

export namespace User {
  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.User.id,
      }),
      name: z.string().nullable().openapi({
        description: "Name of the user.",
        example: Examples.User.name,
      }),
      email: z.string().nullable().openapi({
        description: "Email address of the user.",
        example: Examples.User.email,
      }),
      stripeCustomerID: z.string().openapi({
        description: "Stripe customer ID of the user.",
        example: Examples.User.stripeCustomerID,
      }),
      workspaceID: z.string().openapi({
        description: "Workspace ID of the user.",
        example: Examples.User.workspaceID,
      }),
    })
    .openapi({
      ref: "User",
      description: "A User object.",
      example: Examples.User,
    });

  export const Event = {
    Created: defineEvent(
      "user.created",
      z.object({
        userID: Info.shape.id,
      }),
    ),
    Updated: defineEvent(
      "user.updated",
      z.object({
        userID: Info.shape.id,
      }),
    ),
  };

  // operations
  export const create = fn(
    z.object({
      email: z.string(),
    }),
    async ({ email }) => {
      const id = createID("user");
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userID: id,
        },
      });
      return await createTransaction(async (tx) => {
        // 1. new workspace, default
        const workspaceID = createID("workspace");
        await tx.insert(workspaceTable).values({
          id: workspaceID,
          slug: `workspace-${id}`,
        });
        // 2. create new user
        await tx.insert(userTable).values({
          workspaceID,
          id,
          email,
          name: customer?.name ?? "not_provided",
          stripeCustomerID: customer?.id,
        });
        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, { userID: id }),
        );
        return { id, workspaceID };
      });
    },
  );

  export const merge = fn(z.string().array(), async (ids) => {
    const primary = ids.shift();
    if (!primary) throw new Error("No primary user");

    await useTransaction(async (tx) => {
      // get primary user info
      const primaryUser = await tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, primary))
        .then((rows) => rows.at(0));

      if (!primaryUser) throw new Error("Primary user not found");

      // update the users to be merged, mark them as deleted
      // use soft delete, set timeDeleted field
      await tx
        .update(userTable)
        .set({
          timeDeleted: new Date(),
        })
        .where(inArray(userTable.id, ids));

      // if your system has other tables that reference userID, you also need to update them
      // for example, if you have project table, file table, etc, you can refer to the sample code pattern:
      // await tx
      //   .update(projectTable)
      //   .set({
      //     userID: primary,
      //   })
      //   .where(inArray(projectTable.userID, ids));
    });

    return primary;
  });

  export const update = fn(
    Info.pick({ name: true, email: true, id: true }).partial({
      name: true,
      email: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Updated, {
            userID: input.id,
          }),
        );
        await tx
          .update(userTable)
          .set({
            name: input.name,
            email: input.email ?? undefined,
          })
          .where(eq(userTable.id, input.id));
      }),
  );

  export const deleteUser = fn(Info.shape.id, async (id) =>
    useTransaction(async (tx) => {
      await tx.delete(userTable).where(eq(userTable.id, id));
    }),
  );

  export const fromID = fn(Info.shape.id, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  export const fromEmail = fn(z.string(), async (email) =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.email, email), isNull(userTable.timeDeleted)))
        .orderBy(asc(userTable.timeCreated))
        .then((rows) => rows.map(serialize)),
    ),
  );

  export const fromCustomerID = fn(Info.shape.stripeCustomerID, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.stripeCustomerID, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  export const workspaces = () => {
    return useTransaction((tx) =>
      tx
        .select(getTableColumns(workspaceTable))
        .from(workspaceTable)
        .innerJoin(userTable, eq(userTable.workspaceID, workspaceTable.id))
        .where(
          and(
            eq(userTable.email, Actor.email()),
            isNull(userTable.timeDeleted),
            isNull(workspaceTable.timeDeleted),
          ),
        )
        .execute(),
    );
  };

  function serialize(
    input: typeof userTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      name: input.name,
      email: input.email,
      stripeCustomerID: input.stripeCustomerID,
      workspaceID: input.workspaceID,
    };
  }
}
