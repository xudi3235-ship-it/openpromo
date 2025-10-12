import { id, timestamps } from "@core/helpers/db";
import type { SharedAttachmentSpec } from "@shared/content";
import {
  type ProductMetadata,
  ProductSource,
  ProductState,
  ProductStateZod,
} from "@shared/product";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as z from "zod";
import { workspaceID } from "./workspaces.sql";

export * from "@shared/product";

// ----- enums -----
export const productSourceEnum = pgEnum("product_source", ProductSource);
export const productStateEnum = pgEnum("product_state", ProductState);

/**
 * represents a product of business.
 */
export const productTable = pgTable(
  "product",
  {
    ...id,
    ...workspaceID,
    ...timestamps,

    // Basic info
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    // Source tracking
    source: productSourceEnum().notNull().default("MANUAL"),
    sourceUrl: text("source_url"),

    // Processing state
    state: productStateEnum().notNull().default("not_started"),
    stateMessage: text("state_message"), // Error message or status details

    // Workflow tracking
    workflowInstanceId: text("workflow_instance_id"), // CF Workflow instance ID

    // product assets, e.g. images, videos, or links.
    attachments: jsonb("attachments")
      .$type<SharedAttachmentSpec[]>()
      .notNull()
      .default([]),
    primaryAttachmentId: text("primary_attachment_id"),

    // more stuff
    metadata: jsonb("metadata").$type<ProductMetadata>(),
  },
  (t) => [uniqueIndex().on(t.id, t.workspaceId)],
);

const productRefinements = {
  source: z.enum(ProductSource).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  state: ProductStateZod.default("not_started"),
  tags: z.array(z.string()).default([]),
};

export const ProductInsert = createInsertSchema(
  productTable,
  productRefinements,
);
export const ProductUpdate = createUpdateSchema(
  productTable,
  productRefinements,
);
export const ProductSelect = createSelectSchema(
  productTable,
  productRefinements,
);

export type ProductInsertType = z.infer<typeof ProductInsert>;
export type ProductUpdateType = z.infer<typeof ProductUpdate>;
export type ProductSelectType = z.infer<typeof ProductSelect>;

// ---------------------------------------------------------------------------
// Style components
// ---------------------------------------------------------------------------

export const styleComponentTable = pgTable(
  "style_component",
  {
    ...id,
    ...timestamps,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    imageRefs: jsonb("image_refs").$type<string[]>().notNull().default([]),
    imageGenPrompt: text("image_gen_prompt").notNull(),
  },
  (table) => [uniqueIndex().on(table.slug), uniqueIndex().on(table.name)],
);

const styleComponentRefinements = {
  imageRefs: z.array(z.string()).default([]),
};

export const StyleComponentInsert = createInsertSchema(
  styleComponentTable,
  styleComponentRefinements,
);
export const StyleComponentUpdate = createUpdateSchema(
  styleComponentTable,
  styleComponentRefinements,
);
export const StyleComponentSelect = createSelectSchema(
  styleComponentTable,
  styleComponentRefinements,
);

export type StyleComponentInsertType = z.infer<typeof StyleComponentInsert>;
export type StyleComponentUpdateType = z.infer<typeof StyleComponentUpdate>;
export type StyleComponentSelectType = z.infer<typeof StyleComponentSelect>;
