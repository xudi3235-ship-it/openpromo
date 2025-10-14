import * as z from "zod";
import {
  InboxConversationUpsertedEventSchema,
  InboxMessageUpsertedEventSchema,
  InboxRealtimeEventTypes,
} from "../inbox";
import { StyleStateZod } from "../style";

/**
 * Workspace realtime event types
 * These events are dispatched through the WorkspacePusher for real-time updates
 */
export enum WorkspaceEventType {
  ImageGenerationUpdated = "image_generation.updated",
  StyleComponentUpdated = "style_component.updated",
  // Inbox events are included via their own enum (InboxRealtimeEventTypes)
  // Add more event types as needed
}

// ============ Shared Type Definitions ============

/**
 * Image generation state enum
 */
export const ImageGenerationStateSchema = z.enum([
  "not_started",
  "pending",
  "generating",
  "completed",
  "failed",
]);

export type ImageGenerationState = z.infer<typeof ImageGenerationStateSchema>;

// ============ Image Generation Events ============

/**
 * Event fired when an image generation is created or updated
 * Contains only the essential fields needed for client-side UI updates
 */
export const ImageGenerationUpdatedEventSchema = z.object({
  type: z.literal(WorkspaceEventType.ImageGenerationUpdated),
  generationId: z.string(),
  state: ImageGenerationStateSchema,
  stateMessage: z.string().nullable().optional(),
  outputImages: z.array(z.string()).optional(),
  timestamp: z.number(),
});

export type ImageGenerationUpdatedEvent = z.infer<
  typeof ImageGenerationUpdatedEventSchema
>;

// ============ Style Component Events ============

/**
 * Event fired when a style component is created or updated
 * Contains essential fields needed for client-side UI updates
 */
export const StyleComponentUpdatedEventSchema = z.object({
  type: z.literal(WorkspaceEventType.StyleComponentUpdated),
  styleId: z.string(),
  state: StyleStateZod,
  failureReason: z.string().nullable().optional(),
  timestamp: z.number(),
});

export type StyleComponentUpdatedEvent = z.infer<
  typeof StyleComponentUpdatedEventSchema
>;

// ============ Union of All Workspace Events ============

/**
 * Discriminated union of all workspace realtime events
 * Use this for type-safe event handling
 * Includes both workspace-specific events and inbox events
 */
export const WorkspaceEventSchema = z.discriminatedUnion("type", [
  ImageGenerationUpdatedEventSchema,
  StyleComponentUpdatedEventSchema,
  InboxConversationUpsertedEventSchema,
  InboxMessageUpsertedEventSchema,
  // Add more event schemas here as needed
]);

export type WorkspaceEvent = z.infer<typeof WorkspaceEventSchema>;

// ============ Event Schema Map ============

/**
 * Map of event types to their corresponding Zod schemas
 * Used by the generic createWorkspaceEvent helper
 */
const eventSchemaMap = {
  [WorkspaceEventType.ImageGenerationUpdated]:
    ImageGenerationUpdatedEventSchema,
  [WorkspaceEventType.StyleComponentUpdated]: StyleComponentUpdatedEventSchema,
  [InboxRealtimeEventTypes.ConversationUpserted]:
    InboxConversationUpsertedEventSchema,
  [InboxRealtimeEventTypes.MessageUpserted]: InboxMessageUpsertedEventSchema,
} as const;

type EventSchemaMap = typeof eventSchemaMap;

// ============ Generic Helper Function ============

/**
 * Generic type-safe event creator
 * Automatically selects the correct schema based on the event type
 * and adds the timestamp
 *
 * @example
 * ```ts
 * const event = createWorkspaceEvent("image_generation.updated", {
 *   generationId: "123",
 *   state: "completed",
 *   stateMessage: null,
 * });
 * ```
 */
export function createWorkspaceEvent<T extends WorkspaceEvent["type"]>(
  type: T,
  data: Omit<Extract<WorkspaceEvent, { type: T }>, "type" | "timestamp">,
): Extract<WorkspaceEvent, { type: T }> {
  const schema = eventSchemaMap[type as keyof EventSchemaMap];
  return schema.parse({
    type,
    ...data,
    timestamp: Date.now(),
  }) as Extract<WorkspaceEvent, { type: T }>;
}
