import { and, eq } from "drizzle-orm";
import { db } from "@/helpers/db";
import {
  type ConnectedAccountSelect,
  ConnectedAccountSelectSchema,
  connectedAccount,
  type Platform,
} from "@/schemas/connected-account.sql";
import { fn } from "@/utils/fn";
import { Actor } from "../../actor";

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
}
