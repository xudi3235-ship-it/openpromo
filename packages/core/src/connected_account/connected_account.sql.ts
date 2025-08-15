import { index, json, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { id, timestamps } from "../drizzle/types";
import { workspaceID, workspaceIndexes } from "../workspace/workspace.sql";

// Platform enum for supported social media platforms
export const Platform = z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK", "GITHUB"]);
export type Platform = z.infer<typeof Platform>;

// Status enum for connected account status
export const ConnectedAccountStatus = z.enum([
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "ERROR",
]);

// metadata schemas
export const FBMetadata = z.object({
  pageId: z.string().optional(),
  adAccountId: z.string().optional(),
});

export const IGMetadata = z.object({
  userId: z.string().optional(),
  adAccountId: z.string().optional(),
});

export const ConnectedAccountMetadata = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal(Platform.Enum.FACEBOOK),
    ...FBMetadata.shape,
  }),
  z.object({
    platform: z.literal(Platform.Enum.INSTAGRAM),
    ...IGMetadata.shape,
  }),
]);

export type ConnectedAccountMetadata = z.infer<typeof ConnectedAccountMetadata>;

export type ConnectedAccountStatus = z.infer<typeof ConnectedAccountStatus>;

export function assertMetadata<T extends Platform>(
  platform: T,
  metadata: ConnectedAccountInsert["metadata"],
): Extract<ConnectedAccountMetadata, { platform: T }> {
  if (metadata.platform !== platform) {
    throw new Error(`Metadata does not match platform: ${platform}`);
  }
  return metadata as Extract<ConnectedAccountMetadata, { platform: T }>;
}

// Connected Account DTO schema
export const ConnectedAccountDTO = z.object({
  id: z.string(),
  workspaceID: z.string(),
  platform: Platform,
  externalAccountId: z.string(),
  accountName: z.string(),
  status: ConnectedAccountStatus,
  encryptedAccessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.date().optional(),
  scopes: z.array(z.string()).optional(),
  metadata: ConnectedAccountMetadata.optional(),
  timeCreated: z.date(),
  timeUpdated: z.date(),
});

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
    accountName: varchar("account_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .$type<ConnectedAccountStatus>()
      .default(ConnectedAccountStatus.Enum.ACTIVE),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamps.timeCreated,
    scopes: json("scopes").$type<string[]>().default([]),
    metadata: json("metadata").$type<ConnectedAccountMetadata>().notNull(),
  },
  (table) => [
    ...workspaceIndexes(table),
    index("platform_idx").on(table.platform),
    index("external_account_idx").on(table.externalAccountId),
    index("workspace_platform_idx").on(table.workspaceID, table.platform),
  ],
);

export type ConnectedAccountInsert = typeof connectedAccount.$inferInsert;
export type ConnectedAccountSelect = typeof connectedAccount.$inferSelect;
