import { id, timestamps, ulid } from "@core/database/types";
import {
  type AnyPgColumn,
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
import * as z from "zod";
import { productTable } from "./product.sql";
import { styleComponentTable } from "./style.sql";
import { workspaceID } from "./workspaces.sql";

// ----- Image Generation -----
// to make this compatible, fields should be all optional and have defaults upon creation
export const ImageGenMetaSchema = z
  .object({
    prompt: z.string().optional(),
    generatedPrompt: z.string().optional(),
    referenceImageUrl: z.string().optional(),
    inputImages: z.array(z.string()).min(1).optional(),
    parentGenerationId: z.string().optional(),
    variationPrompt: z.string().optional(),
  })
  .default({});
export type ImageGenMeta = z.infer<typeof ImageGenMetaSchema>;

export const ImageGenContext = z.object({
  styleCtx: z.string().describe("serialized style ctx"),
  productCtx: z.string().describe("serialized product ctx"),
});
export type ImageGenContext = z.infer<typeof ImageGenContext>;

export const imageGenerationStates = [
  "not_started",
  "pending",
  "generating",
  "completed",
  "failed",
] as const;
export type ImageGenerationState = (typeof imageGenerationStates)[number];

export const imageGenerationStateEnum = pgEnum(
  "image_generation_state",
  imageGenerationStates,
);

/**
 * represents an image generation run.
 * style 1:N map to image gen.
 * product 1:N map to image gen.
 * it can be associated with either, or both
 */
export const imageGenerationTable = pgTable(
  "image_generation",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    // relations
    styleComponentId: ulid("style_component_id").references(
      () => styleComponentTable.id,
      { onDelete: "set null" },
    ),
    productId: ulid("product_id").references(() => productTable.id, {
      onDelete: "set null",
    }),
    // params
    outputImages: jsonb("output_images")
      .$type<string[]>()
      .notNull()
      .default([]),
    metadata: jsonb("metadata").$type<ImageGenMeta>().notNull().default({}),
    context: jsonb("context").$type<ImageGenContext>(),
    parentGenerationId: ulid("parent_generation_id").references(
      (): AnyPgColumn => imageGenerationTable.id,
      { onDelete: "set null" },
    ),
    // tracking state
    state: imageGenerationStateEnum()
      .notNull()
      .default("pending")
      .$type<ImageGenerationState>(),
    stateMessage: text("state_message"),
    workflowInstanceId: text("workflow_instance_id"),
  },
  (table) => [uniqueIndex().on(table.id), index().on(table.createdAt)],
);

const opts = {
  outputImages: z.array(z.string()).default([]),
  state: z.enum(imageGenerationStates).default("pending"),
  stateMessage: z.string().optional().nullable(),
  workflowInstanceId: z.string().optional().nullable(),
};

export const ImageGenerationInsert = createInsertSchema(
  imageGenerationTable,
  opts,
);

export const ImageGenerationUpdate = createUpdateSchema(
  imageGenerationTable,
  opts,
);

export const ImageGenerationSelect = createSelectSchema(
  imageGenerationTable,
  opts,
);

export type ImageGenerationInsertType = z.infer<typeof ImageGenerationInsert>;
export type ImageGenerationUpdateType = z.infer<typeof ImageGenerationUpdate>;
export type ImageGenerationSelectType = z.infer<typeof ImageGenerationSelect>;
