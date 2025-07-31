import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { createID } from "../util/id";
import { Actor } from "../actor";
import { fn } from "../util/fn";
import {
  connectedAccount,
  ConnectedAccountDTO,
  Platform,
  ConnectedAccountStatus,
  type ConnectedAccountInsert,
  type ConnectedAccountSelect,
} from "./connected_account.sql";
import { defineEvent } from "../event";
import { afterTx, createTransaction } from "../drizzle/transaction";
import { bus } from "sst/aws/bus";
import { Resource } from "sst";

export namespace ConnectedAccount {
  export const Info = ConnectedAccountDTO;

  export const Event = {
    Created: defineEvent(
      "connected_account.created",
      z.object({
        id: Info.shape.id,
        workspaceID: Info.shape.workspaceID,
        platform: Info.shape.platform,
      }),
    ),
    Updated: defineEvent(
      "connected_account.updated",
      Info.pick({ id: true, workspaceID: true, status: true }),
    ),
    Deleted: defineEvent(
      "connected_account.deleted",
      z.object({
        id: Info.shape.id,
        workspaceID: Info.shape.workspaceID,
      }),
    ),
    TokenRefreshed: defineEvent(
      "connected_account.token_refreshed",
      z.object({
        id: Info.shape.id,
        workspaceID: Info.shape.workspaceID,
        platform: Info.shape.platform,
      }),
    ),
  };

  // Create a new connected account
  export const create = fn(
    Info.omit({ id: true, timeCreated: true, timeUpdated: true }),
    async (input) => {
      const id = createID("connected_account");
      const workspaceID = Actor.workspaceID();

      await createTransaction(async (tx) => {
        await tx.insert(connectedAccount).values({
          id,
          workspaceID,
          platform: input.platform,
          externalAccountId: input.externalAccountId,
          accountName: input.accountName,
          status: input.status || "ACTIVE",
          encryptedAccessToken: input.encryptedAccessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          scopes: input.scopes || [],
          metadata: input.metadata!,
        });

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, {
            id,
            workspaceID,
            platform: input.platform,
          }),
        );
      });

      return id;
    },
  );

  // Update connected account
  export const update = fn(
    Info.pick({
      id: true,
      accountName: true,
      status: true,
      encryptedAccessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      scopes: true,
      metadata: true,
    }),
    async (input) => {
      const workspaceID = Actor.workspaceID();

      return createTransaction(async (tx) => {
        const existing = await tx
          .select()
          .from(connectedAccount)
          .where(
            and(
              eq(connectedAccount.id, input.id),
              eq(connectedAccount.workspaceID, workspaceID),
            ),
          )
          .then((rows) => rows[0]);

        if (!existing) {
          throw new Error("Connected account not found");
        }

        await tx
          .update(connectedAccount)
          .set({
            accountName: input.accountName,
            status: input.status,
            encryptedAccessToken: input.encryptedAccessToken,
            refreshToken: input.refreshToken,
            tokenExpiresAt: input.tokenExpiresAt,
            scopes: input.scopes,
            metadata: input.metadata,
          })
          .where(
            and(
              eq(connectedAccount.id, input.id),
              eq(connectedAccount.workspaceID, workspaceID),
            ),
          );

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Updated, {
            id: input.id,
            workspaceID,
            status: input.status || existing.status,
          }),
        );

        return serialize({ ...existing, ...input });
      });
    },
  );

  // List connected accounts for workspace
  export const list = fn(z.object({}), async () => {
    const workspaceID = Actor.workspaceID();

    return createTransaction(async (tx) => {
      const results = await tx
        .select()
        .from(connectedAccount)
        .where(eq(connectedAccount.workspaceID, workspaceID))
        .orderBy(desc(connectedAccount.timeCreated));

      return results.map(serialize);
    });
  });

  // Get connected account by ID
  export const get = fn(z.object({ id: z.string() }), async ({ id }) => {
    const workspaceID = Actor.workspaceID();

    return createTransaction(async (tx) => {
      const result = await tx
        .select()
        .from(connectedAccount)
        .where(
          and(
            eq(connectedAccount.id, id),
            eq(connectedAccount.workspaceID, workspaceID),
          ),
        )
        .then((rows) => rows.at(0));

      if (!result) {
        throw new Error("Connected account not found");
      }

      return serialize(result);
    });
  });

  // Update token (for refresh operations)
  export const updateToken = fn(
    z.object({
      id: z.string(),
      encryptedAccessToken: z.string(),
      refreshToken: z.string().optional(),
      tokenExpiresAt: z.date().optional(),
    }),
    async (input) => {
      const workspaceID = Actor.workspaceID();

      return createTransaction(async (tx) => {
        const existing = await tx
          .select()
          .from(connectedAccount)
          .where(
            and(
              eq(connectedAccount.id, input.id),
              eq(connectedAccount.workspaceID, workspaceID),
            ),
          )
          .then((rows) => rows[0]);

        if (!existing) {
          throw new Error("Connected account not found");
        }

        await tx
          .update(connectedAccount)
          .set({
            encryptedAccessToken: input.encryptedAccessToken,
            refreshToken: input.refreshToken,
            tokenExpiresAt: input.tokenExpiresAt,
            status: "ACTIVE", // Reset status to active on successful token refresh
          })
          .where(
            and(
              eq(connectedAccount.id, input.id),
              eq(connectedAccount.workspaceID, workspaceID),
            ),
          );

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.TokenRefreshed, {
            id: input.id,
            workspaceID,
            platform: existing.platform,
          }),
        );

        return serialize({
          ...existing,
          ...input,
          status: ConnectedAccountStatus.Enum.ACTIVE,
        });
      });
    },
  );

  // Mark account as expired/error
  export const updateStatus = fn(
    z.object({
      id: z.string(),
      status: ConnectedAccountStatus,
    }),
    async (input) => {
      const workspaceID = Actor.workspaceID();

      return createTransaction(async (tx) => {
        await tx
          .update(connectedAccount)
          .set({ status: input.status })
          .where(
            and(
              eq(connectedAccount.id, input.id),
              eq(connectedAccount.workspaceID, workspaceID),
            ),
          );

        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Updated, {
            id: input.id,
            workspaceID,
            status: input.status,
          }),
        );
      });
    },
  );

  // Delete connected account
  export const remove = fn(z.object({ id: z.string() }), async ({ id }) => {
    const workspaceID = Actor.workspaceID();

    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(connectedAccount)
        .where(
          and(
            eq(connectedAccount.id, id),
            eq(connectedAccount.workspaceID, workspaceID),
          ),
        )
        .then((rows) => rows[0]);

      if (!existing) {
        throw new Error("Connected account not found");
      }

      await tx
        .delete(connectedAccount)
        .where(
          and(
            eq(connectedAccount.id, id),
            eq(connectedAccount.workspaceID, workspaceID),
          ),
        );

      await afterTx(() =>
        bus.publish(Resource.Bus, Event.Deleted, {
          id,
          workspaceID,
        }),
      );
    });
  });

  // Get accounts by platform
  export const getByPlatform = fn(
    z.object({ platform: Platform }),
    async ({ platform }) => {
      const workspaceID = Actor.workspaceID();

      return createTransaction(async (tx) => {
        const results = await tx
          .select()
          .from(connectedAccount)
          .where(
            and(
              eq(connectedAccount.workspaceID, workspaceID),
              eq(connectedAccount.platform, platform),
              eq(connectedAccount.status, ConnectedAccountStatus.Enum.ACTIVE),
            ),
          )
          .orderBy(desc(connectedAccount.timeCreated));

        return results.map(serialize);
      });
    },
  );

  function serialize(input: ConnectedAccountSelect): z.infer<typeof Info> {
    return {
      id: input.id,
      workspaceID: input.workspaceID,
      platform: input.platform,
      externalAccountId: input.externalAccountId,
      accountName: input.accountName,
      status: input.status,
      encryptedAccessToken: input.encryptedAccessToken,
      refreshToken: input.refreshToken ?? undefined,
      tokenExpiresAt: input.tokenExpiresAt ?? undefined,
      scopes: input.scopes ?? undefined,
      metadata: input.metadata ?? undefined,
      timeCreated: input.timeCreated,
      timeUpdated: input.timeUpdated,
    };
  }
}
