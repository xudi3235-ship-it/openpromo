import { db } from "@core/helpers/db";
import {
  type ConnectedAccountSelect,
  ConnectedAccountSelectSchema,
  connectedAccount,
  type Platform,
} from "@core/schemas/connected-account.sql";
import { fn } from "@core/utils/fn";
import { and, eq } from "drizzle-orm";
import { Actor } from "../../helpers/actor";

export namespace ConnectedAccount {
  export const Info = ConnectedAccountSelectSchema;

  export const Event = {
    // TODO: define events, setup event bus handling.
  };

  // link a new connected account
  export const create = fn(
    Info.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      workspaceId: true,
    }),
    async (input) => {
      const workspaceId = Actor.workspaceID();
      const [acc] = await db()
        .insert(connectedAccount)
        .values({
          workspaceId,
          platform: input.platform as Platform,
          externalAccountId: input.externalAccountId,
          accountName: input.accountName,
          externalUrl: input.externalUrl,
          encryptedAccessToken: input.encryptedAccessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          metadata: input.metadata,
        })
        .onConflictDoUpdate({
          target: [
            connectedAccount.workspaceId,
            connectedAccount.externalAccountId,
          ],
          set: {
            accountName: input.accountName,
            externalUrl: input.externalUrl,
            encryptedAccessToken: input.encryptedAccessToken,
            refreshToken: input.refreshToken,
            tokenExpiresAt: input.tokenExpiresAt,
            metadata: input.metadata,
          },
        })
        .returning();

      return acc;
    },
  );
  export async function list(): Promise<ConnectedAccountSelect[]> {
    const workspaceId = Actor.workspaceID();
    const accounts = await db()
      .select()
      .from(connectedAccount)
      .where(eq(connectedAccount.workspaceId, workspaceId));
    return accounts;
  }
  export async function deleteById(id: string): Promise<void> {
    const workspaceId = Actor.workspaceID();
    await db()
      .delete(connectedAccount)
      .where(
        and(
          eq(connectedAccount.id, id),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .execute();
  }
  export async function fromID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.id, id),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      );
    if (!acc) throw new Error("connected account not found");
    return acc;
  }
  export async function fromFBPageID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "FACEBOOK"),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!acc) throw new Error("connected account not found");
    return acc;
  }
  // ------------------------------ internal ------------------------------
  export async function _createDummy(): Promise<ConnectedAccountSelect> {
    const accountName = `[Internal] dummy account`;
    // check if exists
    const workspaceId = Actor.workspaceID();
    const existing = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.workspaceId, workspaceId),
          eq(connectedAccount.accountName, accountName),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    return await ConnectedAccount.create({
      platform: "FACEBOOK",
      externalAccountId: "dummy",
      accountName,
      externalUrl: "https://facebook.com/dummy",
      encryptedAccessToken: "dummy-token",
      refreshToken: "dummy-refresh",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      metadata: {},
      profilePicUrl: null,
    });
  }
}
