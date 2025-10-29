import { id, timestamp, timestamps, ulid } from "@core/helpers/db";
import { AllPlatforms } from "@shared/content";
import {
  index,
  integer,
  jsonb,
  pgEnum,
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
export const platformPgEnum = pgEnum("platform", [
  AllPlatforms.FACEBOOK,
  AllPlatforms.INSTAGRAM,
  AllPlatforms.TIKTOK,
]);
export const Platform = z.enum(platformPgEnum.enumValues);
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
  appScopedUserID: z.string().optional(),
});
const TikTokAccountMetadata = z.object({
  tiktokUserId: z.string(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  profilePicUrl: z.string(),
  permissions: z.string().array(),
  unionId: z.string().optional(),
});
export type FBPageMetadata = z.infer<typeof FBPageMetadata>;
export type IGAccountMetadata = z.infer<typeof IGAccountMetadata>;
export type TikTokAccountMetadata = z.infer<typeof TikTokAccountMetadata>;
export type ConnectedAccountMetadata =
  | FBPageMetadata
  | IGAccountMetadata
  | TikTokAccountMetadata;

export const connectedAccount = pgTable(
  "connected_account",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    platform: platformPgEnum().notNull(),
    externalAccountId: varchar("external_account_id", {
      length: 255,
    })
      .notNull()
      .unique(),
    externalUrl: text().notNull(),
    // display name
    accountName: varchar("account_name", { length: 255 }),
    profilePicUrl: text("profile_pic_url"),
    // oauth stuff
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp(),
    metadata: jsonb("metadata").$type<ConnectedAccountMetadata>().notNull(),
    // content backfill tracking
    lastBackfillAt: timestamp(),
    // metrics for the account
    followersCount: integer("followers_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    metricsRefreshedAt: timestamp(),
  },
  (table) => [
    index("platform_idx").on(table.platform),
    index("workspace_platform_idx").on(table.workspaceId, table.platform),
    unique().on(table.workspaceId, table.externalAccountId),
    unique().on(table.platform, table.externalAccountId),
  ],
);

export const connectedAccountId = {
  connectedAccountId: ulid("connected_account_id")
    .notNull()
    .references(() => connectedAccount.id, { onDelete: "cascade" }),
};

const opts = {
  platform: Platform,
  lastBackfillAt: z.date().nullable(),
  followersCount: z.number().int().nonnegative().optional(),
  followingCount: z.number().int().nonnegative().optional(),
  metricsRefreshedAt: z.coerce.date().nullable().optional(),
};

// select
export const ConnectedAccountSelectSchema = createSelectSchema(
  connectedAccount,
  opts,
);
export type ConnectedAccountSelect = z.infer<
  typeof ConnectedAccountSelectSchema
>;

const SelectWithoutSensitive = ConnectedAccountSelectSchema.omit({
  encryptedAccessToken: true,
  refreshToken: true,
});

export type ConnectedAccountWithoutSensitive = z.infer<
  typeof SelectWithoutSensitive
>;

export const ConnectedAccountInsertSchema = createInsertSchema(
  connectedAccount,
  opts,
);

export type ConnectedAccountInsert = z.infer<
  typeof ConnectedAccountInsertSchema
>;
// update
export const ConnectedAccountUpdateSchema = createUpdateSchema(
  connectedAccount,
  opts,
);
