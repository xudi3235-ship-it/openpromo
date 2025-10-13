// ---------------------------------------------------------------------------
// Style components
// ---------------------------------------------------------------------------

import { id, timestamps } from "@core/helpers/db";
import { StyleState } from "@shared/style";
import {
  boolean,
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

export const styleComponentStateEnum = pgEnum(
  "style_component_state",
  StyleState,
);

export const StyleContext = z.object({
  imagesPrompt: z
    .string()
    .describe(
      "image prompts of the input images, detailed, effective, concise, can be used to generate similar images to refs",
    ),
  industry: z.array(z.string()).describe("industries suitable for this style"),
  categories: z
    .array(z.string())
    .describe("categories suitable for this style"),
  searchKeywords: z
    .array(z.string())
    .describe("4-7 search keywords that can be used to search for this style."),
});

export type StyleContext = z.infer<typeof StyleContext>;

export const styleComponentTable = pgTable(
  "style_component",
  {
    ...id,
    ...timestamps,
    creatorID: text("creator_id").notNull(), // user id of the creator
    isOfficial: boolean("is_official").notNull().default(false),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // state machine
    state: styleComponentStateEnum().notNull().default("not_started"),
    failureReason: text("failure_reason"),
    // fields
    description: text("description").notNull(),
    imageRefs: jsonb("image_refs").$type<string[]>().notNull().default([]),
    imageGenPrompt: text("image_gen_prompt").notNull(),
    context: jsonb("context").$type<StyleContext | null>().default(null),
  },
  (table) => [uniqueIndex().on(table.slug), uniqueIndex().on(table.name)],
);

const styleComponentRefinements = {
  imageRefs: z.array(z.string()).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  context: StyleContext.nullable().default(null),
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
