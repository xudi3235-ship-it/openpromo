import { and, eq, isNull } from "drizzle-orm";
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
import { userTable } from "../user/user.sql";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { workspaceTable } from "../workspace/workspace.sql";
import { userWorkspaceTable } from "./user_workspace.sql";

export namespace UserWorkspace {
  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: "uwrk_01234567890123456789012345",
      }),
      userId: z.string().openapi({
        description: "User ID",
        example: Examples.User.id,
      }),
      workspaceID: z.string().openapi({
        description: "Workspace ID",
        example: Examples.Workspace.id,
      }),
      roleId: z.string().nullable().openapi({
        description: "Role ID for permissions",
        example: "role_admin",
      }),
      joinedAt: z.date().nullable().openapi({
        description: "When user joined workspace",
      }),
    })
    .openapi({
      ref: "UserWorkspace",
      description: "A UserWorkspace membership object.",
    });

  export const Event = {
    Created: defineEvent(
      "user_workspace.created",
      z.object({
        userWorkspaceId: Info.shape.id,
        userId: Info.shape.userId,
        workspaceID: Info.shape.workspaceID,
      }),
    ),
    Updated: defineEvent(
      "user_workspace.updated",
      z.object({
        userWorkspaceId: Info.shape.id,
      }),
    ),
    Removed: defineEvent(
      "user_workspace.removed",
      z.object({
        userWorkspaceId: Info.shape.id,
        userId: Info.shape.userId,
        workspaceID: Info.shape.workspaceID,
      }),
    ),
  };

  // Create user workspace membership
  export const create = fn(
    z.object({
      userId: z.string(),
      workspaceID: z.string(),
      roleId: z.string().optional(),
      isOwner: z.boolean().optional().default(false),
      isPrimary: z.boolean().optional().default(false),
      joinMethod: z.string().optional().default("invited"),
    }),
    async (input) => {
      const id = createID("user_workspace");
      return await createTransaction(async (tx) => {
        await tx.insert(userWorkspaceTable).values({
          id,
          userID: input.userId,
          workspaceID: input.workspaceID,
          roleId: input.roleId || "role_member", // TODO: Use actual default role
          joinedAt: new Date(),
        });

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, {
            userWorkspaceId: id,
            userId: input.userId,
            workspaceID: input.workspaceID,
          }),
        );

        return { id, userId: input.userId, workspaceID: input.workspaceID };
      });
    },
  );

  // Get user's workspaces
  export const userWorkspaces = fn(z.string(), async (userId) =>
    useTransaction((tx) =>
      tx
        .select({
          userWorkspace: userWorkspaceTable,
          workspace: workspaceTable,
        })
        .from(userWorkspaceTable)
        .innerJoin(
          workspaceTable,
          eq(userWorkspaceTable.workspaceID, workspaceTable.id),
        )
        .where(
          and(
            eq(userWorkspaceTable.userID, userId),
            isNull(workspaceTable.timeDeleted),
          ),
        ),
    ),
  );

  // Get workspace members
  export const workspaceMembers = fn(z.string(), async (workspaceID) =>
    useTransaction((tx) =>
      tx
        .select({
          userWorkspace: userWorkspaceTable,
          user: {
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
          },
        })
        .from(userWorkspaceTable)
        .innerJoin(userTable, eq(userWorkspaceTable.userID, userTable.id))
        .where(
          and(
            eq(userWorkspaceTable.workspaceID, workspaceID),
            isNull(userTable.timeDeleted),
          ),
        ),
    ),
  );

  // Check if user has access to workspace
  export const hasAccess = fn(
    z.object({
      userId: z.string(),
      workspaceID: z.string(),
    }),
    async ({ userId, workspaceID }) =>
      useTransaction(async (tx) => {
        const membership = await tx
          .select({ id: userWorkspaceTable.id })
          .from(userWorkspaceTable)
          .where(
            and(
              eq(userWorkspaceTable.userID, userId),
              eq(userWorkspaceTable.workspaceID, workspaceID),
            ),
          )
          .then((rows) => rows.at(0));

        return !!membership;
      }),
  );

  // Update membership
  export const update = fn(
    z.object({
      id: z.string(),
      roleId: z.string().optional(),
      status: z.string().optional(),
      isPrimary: z.boolean().optional(),
    }),
    (input) =>
      useTransaction(async (tx) => {
        await tx
          .update(userWorkspaceTable)
          .set({
            roleId: input.roleId,
          })
          .where(eq(userWorkspaceTable.id, input.id));

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Updated, {
            userWorkspaceId: input.id,
          }),
        );
      }),
  );

  // Remove membership
  export const remove = fn(z.string(), async (id) =>
    useTransaction(async (tx) => {
      const membership = await tx
        .select({
          userId: userWorkspaceTable.userID,
          workspaceID: userWorkspaceTable.workspaceID,
        })
        .from(userWorkspaceTable)
        .where(eq(userWorkspaceTable.id, id))
        .then((rows) => rows.at(0));

      if (!membership) return;

      await tx.delete(userWorkspaceTable).where(eq(userWorkspaceTable.id, id));

      await afterTx(() =>
        bus.publish(Resource.Bus, Event.Removed, {
          userWorkspaceId: id,
          userId: membership.userId,
          workspaceID: membership.workspaceID,
        }),
      );
    }),
  );

  // function _serialize(
  //   input: typeof userWorkspaceTable.$inferSelect,
  // ): z.infer<typeof Info> {
  //   return {
  //     id: input.id,
  //     userId: input.userID,
  //     workspaceID: input.workspaceID,
  //     roleId: input.roleId,
  //     joinedAt: input.joinedAt,
  //   };
  // }
}
