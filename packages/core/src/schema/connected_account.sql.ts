import { index, json, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { id, timestamp, timestamps } from "../drizzle/types";
import { workspaceID } from "./workspaces.sql";

// Platform enum for supported social media platforms
export const Platform = z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]);
export type Platform = z.infer<typeof Platform>;

export const connectedAccount = pgTable(
  "connected_account",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    platform: varchar("platform", { length: 50 }).$type<Platform>().notNull(),
    externalAccountId: varchar("external_account_id", {
      length: 255,
    }).notNull(),
    externalUrl: text().notNull(),
    // display name
    accountName: varchar("account_name", { length: 255 }),
    // oauth stuff
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp(),
    // tbd
    metadata: json("metadata"),
  },
  (table) => [
    index("platform_idx").on(table.platform),
    index("workspace_platform_idx").on(table.workspaceId, table.platform),
  ],
);

export type ConnectedAccountInsert = typeof connectedAccount.$inferInsert;
export type ConnectedAccountSelect = typeof connectedAccount.$inferSelect;
