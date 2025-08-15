import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import z from "zod";
import { Common } from "../common";
import {
  afterTx,
  createTransaction,
  useTransaction,
} from "../drizzle/transaction";
import { defineEvent } from "../event";
import { Examples } from "../examples";
import { stripe } from "../stripe";
import { userWorkspaceTable } from "../user_workspace/user_workspace.sql";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { getWorkOS } from "../workos";
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
      stripeCustomerID: z.string().nullable().openapi({
        description: "Stripe customer ID of the user.",
        example: Examples.User.stripeCustomerID,
      }),
      emailOctopusID: z.string().openapi({
        description: "Email Octopus ID of the user.",
        example: Examples.User.emailOctopusID,
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
      workspaceName: z.string().optional(),
    }),
    async ({ email, workspaceName }) => {
      const id = createID("user");
      const workos = getWorkOS();
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userID: id,
        },
      });
      // TODO: handle org, workspace, etc.
      const workosUser = await workos.userManagement.createUser({
        email,
        externalId: id,
        metadata: {
          stripeCustomerID: customer.id,
        },
      });
      console.log("Created WorkOS user:", workosUser);
      return await createTransaction(async (tx) => {
        // 1. create new user first
        await tx.insert(userTable).values({
          id,
          email,
          workOsUserID: "TODO: create workos user",
          name: customer?.name ?? "not_provided",
          stripeCustomerID: "cus_placeholder", // user should bind them later
          emailOctopusID: "eot_placeholder",
        });

        // 2. create default workspace
        const workspaceID = createID("workspace");
        await tx.insert(workspaceTable).values({
          id: workspaceID,
          workOsWorkspaceID: "TODO: create workos workspace",
          slug: workspaceName
            ? workspaceName.toLowerCase().replace(/\s+/g, "-")
            : `workspace-${id}`,
        });

        // 3. create user-workspace relationship (user as owner and primary)
        const userWorkspaceID = createID("user_workspace");
        await tx.insert(userWorkspaceTable).values({
          id: userWorkspaceID,
          userID: id,
          workspaceID: workspaceID,
          roleId: "role_admin", // TODO: Use actual admin role ID
          joinedAt: new Date(),
        });

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, { userID: id }),
        );
        return { id, workspaceID, userWorkspaceID };
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

      await tx
        .update(userTable)
        .set({
          timeDeleted: new Date(),
        })
        .where(inArray(userTable.id, ids));
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

  export const fromStripeCustomerID = fn(
    Info.shape.stripeCustomerID,
    async (id) => {
      if (!id) return undefined;
      return useTransaction((tx) =>
        tx
          .select()
          .from(userTable)
          .where(eq(userTable.stripeCustomerID, id))
          .then((rows) => rows.map(serialize).at(0)),
      );
    },
  );

  export const fromEmailOctopusID = fn(Info.shape.emailOctopusID, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.emailOctopusID, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  function serialize(
    input: typeof userTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      name: input.name,
      email: input.email,
      stripeCustomerID: input.stripeCustomerID,
      emailOctopusID: input.emailOctopusID,
    };
  }
}
