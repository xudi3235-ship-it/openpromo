/**
 * Asset + AssetLink are our generic media model:
 * - asset: the file itself (image/video), storage info (R2/S3/http), public URL, dimensions/hash.
 * - asset_link: associates an asset to any entity (product, style, agent_run, user, workspace) with a role (style_reference, avatar, brand_asset, generated_output, artifact, etc).
 *
 * This replaces one-off media fields elsewhere so we can reuse assets across contexts and tag their purpose explicitly.
 */
import { id, timestamps, ulid } from "@core/database/types";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
import { workspaceID } from "./workspaces.sql";

export const assetTypeEnum = pgEnum("asset_type", ["image", "video"]);
export type AssetType = z.infer<typeof assetTypeEnum>;

export const storageProviderEnum = pgEnum("asset_storage_provider", [
  "r2",
  "s3",
  "http", // remote only
]);
export type StorageProvider = z.infer<typeof storageProviderEnum>;

export const assetTable = pgTable(
  "asset",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    type: assetTypeEnum("type").notNull(),
    storageProvider: storageProviderEnum("storage_provider")
      .notNull()
      .default("http"),
    bucket: text("bucket"),
    objectKey: text("object_key"),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    width: text("width"),
    height: text("height"),
    hash: text("hash"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.workspaceId),
    index().on(table.type),
    index().on(table.hash),
    index().on(table.storageProvider),
    index().on(table.bucket),
    index().on(table.objectKey),
  ],
);

export const AssetInsert = createInsertSchema(assetTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});
export const AssetUpdate = createUpdateSchema(assetTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});
export const AssetSelect = createSelectSchema(assetTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});

export type AssetInsertType = z.infer<typeof AssetInsert>;
export type AssetUpdateType = z.infer<typeof AssetUpdate>;
export type AssetSelectType = z.infer<typeof AssetSelect>;

export const assetLinkRoleEnum = pgEnum("asset_link_role", [
  "style_reference",
  "avatar",
  "brand_asset",
  "product_source",
  "cover",
  "generated_output",
  "artifact",
  "other",
]);
export type AssetLinkRole = z.infer<typeof assetLinkRoleEnum>;

export const assetLinkEntityEnum = pgEnum("asset_link_entity", [
  "product",
  "style",
  "agent_run",
  "user",
  "workspace",
]);
export type AssetLinkEntity = z.infer<typeof assetLinkEntityEnum>;

export const assetLinkTable = pgTable(
  "asset_link",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    assetId: ulid("asset_id")
      .notNull()
      .references(() => assetTable.id, { onDelete: "cascade" }),
    entityType: assetLinkEntityEnum("entity_type").notNull(),
    entityId: ulid("entity_id").notNull(),
    role: assetLinkRoleEnum("role").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    uniqueIndex().on(table.id),
    index().on(table.workspaceId),
    index().on(table.assetId),
    index().on(table.entityType, table.entityId),
    index().on(table.role),
  ],
);

export const AssetLinkInsert = createInsertSchema(assetLinkTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});
export const AssetLinkUpdate = createUpdateSchema(assetLinkTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});
export const AssetLinkSelect = createSelectSchema(assetLinkTable, {
  metadata: z.record(z.string(), z.any()).default({}),
});

export type AssetLinkInsertType = z.infer<typeof AssetLinkInsert>;
export type AssetLinkUpdateType = z.infer<typeof AssetLinkUpdate>;
export type AssetLinkSelectType = z.infer<typeof AssetLinkSelect>;
