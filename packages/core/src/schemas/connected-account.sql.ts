import { id, timestamp, timestamps, ulid } from "@core/helpers/db";
import {
  index,
  jsonb,
  pgTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as z from "zod";
import { workspaceID } from "./workspaces.sql";

// Platform enum for supported social media platforms
export const Platform = z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]);
export type Platform = z.infer<typeof Platform>;

const FBPageMetadata = z.object({
  pageID: z.string(),
  pageName: z.string(),
  profilePicUrl: z.string(),
  followers: z.number().optional(),
  permissions: z.string().array(),
  // user 1:N pages on FB side.
  user: z.object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    tokenExpiresAt: z.date().optional(),
  }),
});
const IGAccountMetadata = z.object({
  igAccountID: z.string(),
  username: z.string().optional(),
  profilePicUrl: z.string(),
  permissions: z.string().array(),
});
export type FBPageMetadata = z.infer<typeof FBPageMetadata>;
export type IGAccountMetadata = z.infer<typeof IGAccountMetadata>;
export type ConnectedAccountMetadata = FBPageMetadata | IGAccountMetadata;

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
    profilePicUrl: text("profile_pic_url"),
    // oauth stuff
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp(),
    metadata: jsonb("metadata").$type<ConnectedAccountMetadata>().notNull(),
  },
  (table) => [
    index("platform_idx").on(table.platform),
    index("workspace_platform_idx").on(table.workspaceId, table.platform),
    unique().on(table.workspaceId, table.externalAccountId),
  ],
);

export const connectedAccountId = {
  connectedAccountId: ulid("connected_account_id").notNull(),
};
export type ConnectedAccountInsert = typeof connectedAccount.$inferInsert;
export type ConnectedAccountSelect = typeof connectedAccount.$inferSelect;
export const ConnectedAccountSelectSchema =
  createSelectSchema(connectedAccount);
export const ConnectedAccountInsertSchema =
  createInsertSchema(connectedAccount);
export const ConnectedAccountUpdateSchema =
  createUpdateSchema(connectedAccount);
