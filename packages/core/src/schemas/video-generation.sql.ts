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
import * as z from "zod";
import { productTable } from "./product.sql";
import { styleComponentTable } from "./style.sql";
import { workspaceID } from "./workspaces.sql";

// ----- Video Generation -----
// to make this compatible, fields should be all optional and have defaults upon creation
export const VideoGenMetaSchema = z.object({
  // prompt
  prompt: z.string(),
  productImages: z.array(z.string()).min(1),
  avatarImages: z.array(z.string()),
});
export type VideoGenMeta = z.infer<typeof VideoGenMetaSchema>;

export const videoGenerationStates = [
  "not_started",
  "pending",
  "generating",
  "completed",
  "failed",
] as const;
export type VideoGenerationState = (typeof videoGenerationStates)[number];

export const videoGenerationStateEnum = pgEnum(
  "video_generation_state",
  videoGenerationStates,
);

/**
 * a run for video generation. It can be associated
 */
export const videoGenerationTable = pgTable(
  "video_generation",
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
    // fields
    outputVideoUrl: text("output_video_url"),
    metadata: jsonb("metadata").$type<VideoGenMeta>().notNull(),
    // tracking state
    state: videoGenerationStateEnum()
      .notNull()
      .default("not_started")
      .$type<VideoGenerationState>(),
    stateMessage: text("state_message"),
    workflowInstanceId: text("workflow_instance_id"),
  },
  (table) => [uniqueIndex().on(table.id), index().on(table.createdAt)],
);

const opts = {
  state: z.enum(videoGenerationStates).default("not_started"),
};

export const VideoGenerationInsert = createInsertSchema(
  videoGenerationTable,
  opts,
);

export const VideoGenerationUpdate = createUpdateSchema(
  videoGenerationTable,
  opts,
);

export const VideoGenerationSelect = createSelectSchema(
  videoGenerationTable,
  opts,
);

export type VideoGenerationInsertType = z.infer<typeof VideoGenerationInsert>;
export type VideoGenerationUpdateType = z.infer<typeof VideoGenerationUpdate>;
export type VideoGenerationSelectType = z.infer<typeof VideoGenerationSelect>;
