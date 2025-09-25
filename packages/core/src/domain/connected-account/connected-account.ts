import { db } from "@core/helpers/db";
import {
  type ConnectedAccountSelect,
  ConnectedAccountSelectSchema,
  connectedAccount,
} from "@core/schemas/connected-account.sql";
import { fn } from "@core/utils/fn";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { Actor } from "../../helpers/actor";
import { facebookOAuthService } from "./facebook";
import { instagramOAuthService } from "./instagram";
import { tikTokOAuthService } from "./tiktok";

export namespace ConnectedAccount {
  const inAWeek = Date.now() + 7 * 24 * 3600 * 1000;
  const sixtyDaysInSec = 60 * 24 * 3600;
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
          ...input,
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

    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }
    // if about to expire, refresh it
    const newToken = await facebookOAuthService.exchangeForLongLivedToken(
      acc.encryptedAccessToken,
    );

    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );
    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken: newToken.access_token,
      tokenExpiresAt,
    });
    return newAcc;
  }
  export async function fromIGAccountID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "INSTAGRAM"),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!acc) throw new Error("connected account not found");
    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }
    // refresh it if about to expire
    const newToken = await instagramOAuthService.refreshAccessToken(
      acc.encryptedAccessToken,
    );
    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );
    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken: newToken.access_token,
      tokenExpiresAt,
    });
    return newAcc;
  }
  export async function fromTikTokAccountID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.externalAccountId, id),
          eq(connectedAccount.platform, "TIKTOK"),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!acc) throw new Error("connected account not found");

    if (acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() >= inAWeek) {
      return acc;
    }

    if (!acc.refreshToken) {
      return acc;
    }

    const newToken = await tikTokOAuthService.refreshAccessToken(
      acc.refreshToken,
    );

    const tokenExpiresAt = new Date(
      Date.now() + (newToken.expires_in ?? sixtyDaysInSec) * 1000,
    );

    const refreshToken = newToken.refresh_token || acc.refreshToken;

    const newAcc = await updateAccessToken({
      id: acc.id,
      encryptedAccessToken: newToken.access_token,
      refreshToken,
      tokenExpiresAt,
    });

    return newAcc;
  }
  const updateAccessToken = fn(
    z.object({
      id: z.string(),
      encryptedAccessToken: z.string(),
      refreshToken: z.string(),
      tokenExpiresAt: z.date(),
    }),
    async ({ id, ...rest }) => {
      const workspaceId = Actor.workspaceID();
      const [acc] = await db()
        .update(connectedAccount)
        .set(rest)
        .where(
          and(
            eq(connectedAccount.id, id),
            eq(connectedAccount.workspaceId, workspaceId),
          ),
        )
        .returning();
      if (!acc) throw new Error("connected account not found");
      return acc;
    },
  );
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
      metadata: {
        pageID: "dummy",
        pageName: "dummy",
        permissions: ["pages_show_list", "pages_read_engagement"],
        profilePicUrl: "",
        user: {
          accessToken: "dummy",
        },
      },
      profilePicUrl: null,
    });
  }
}
