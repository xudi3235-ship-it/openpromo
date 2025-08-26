import { Actor } from "../actor";
import { createTransaction } from "../drizzle/transaction";
import {
  ConnectedAccountSelectSchema,
  connectedAccount,
  type Platform,
} from "../schema/connected_account.sql";
import { fn } from "../util/fn";

export namespace ConnectedAccount {
  export const Info = ConnectedAccountSelectSchema;

  export const Event = {
    // TODO: define events, setup event bus handling.
  };

  // link a new connected account
  export const create = fn(
    Info.omit({ id: true, timeCreated: true, timeUpdated: true }),
    async (input) => {
      const workspaceId = Actor.workspaceID();
      const [acc] = await createTransaction(async (tx) => {
        return await tx
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
          .returning();
      });

      return acc;
    },
  );
}
