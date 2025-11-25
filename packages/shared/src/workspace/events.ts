import * as z from "zod";
import { videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody } from "../generated/openpromo_backend.zod";
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
  VideoGenerationUpdated = "video_generation.updated",
  StyleComponentUpdated = "style_component.updated",
  // System control events (sent by WorkspacePusher itself)
  Connect = "connect",
  Echo = "echo",
  SessionEvicted = "session_evicted",
  Notification = "notification",
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

// ============ Video Generation Events ============

/**
 * Event fired when a video generation job is updated
 * Contains essential fields needed for client-side UI updates
 *
 * Source of truth: Python Pydantic models in backend/src/routes/callbacks.py
 * Generated via orval from OpenAPI spec - extracted from callback schema's `event` field.
 */
export const VideoGenerationUpdatedEventSchema =
  videoGenCallbackSchemaCallbacksVideoGenSchemaPostBody.shape.event;

export type VideoGenerationUpdatedEvent = z.infer<
  typeof VideoGenerationUpdatedEventSchema
>;

/**
 * Video generation state enum - derived from the generated event schema
 * Source of truth: Python Pydantic models in backend/src/routes/callbacks.py
 */
export const VideoGenerationStateSchema =
  VideoGenerationUpdatedEventSchema.shape.state;

export type VideoGenerationState = z.infer<typeof VideoGenerationStateSchema>;

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

// ============ System Control Events ============

/**
 * Event sent when a WebSocket connection is established
 * This is a system event, not a business event
 */
export const ConnectEventSchema = z.object({
  type: z.literal(WorkspaceEventType.Connect),
  message: z.string().optional(),
  timestamp: z.number(),
  workspaceSlug: z.string().optional(),
});

export type ConnectEvent = z.infer<typeof ConnectEventSchema>;

/**
 * Event sent in response to client messages (echo)
 * This is a system event for testing/debugging
 */
export const EchoEventSchema = z.object({
  type: z.literal(WorkspaceEventType.Echo),
  message: z.unknown(),
  timestamp: z.number(),
  workspaceSlug: z.string().optional(),
});

export type EchoEvent = z.infer<typeof EchoEventSchema>;

/**
 * Event sent when a user session is evicted due to exceeding session limit
 * This is a system event for session management
 */
export const SessionEvictedEventSchema = z.object({
  type: z.literal(WorkspaceEventType.SessionEvicted),
  message: z.string(),
  timestamp: z.number(),
  reason: z.string(),
  maxSessions: z.number(),
});

export type SessionEvictedEvent = z.infer<typeof SessionEvictedEventSchema>;

/**
 * Event sent for workspace notifications
 * This is a system event for notifications
 */
export const NotificationEventSchema = z.object({
  type: z.literal(WorkspaceEventType.Notification),
  workspaceSlug: z.string(),
  timestamp: z.number(),
  notification: z.unknown(), // WorkspaceNotification type
});

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

// ============ Union of All Workspace Events ============

/**
 * Discriminated union of all workspace realtime events
 * Use this for type-safe event handling
 * Includes business events, inbox events, and system control events
 */
export const WorkspaceEventSchema = z.discriminatedUnion("type", [
  // Business events
  ImageGenerationUpdatedEventSchema,
  VideoGenerationUpdatedEventSchema,
  StyleComponentUpdatedEventSchema,
  // System control events
  ConnectEventSchema,
  EchoEventSchema,
  SessionEvictedEventSchema,
  NotificationEventSchema,
  // Inbox events
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
  // Business events
  [WorkspaceEventType.ImageGenerationUpdated]:
    ImageGenerationUpdatedEventSchema,
  [WorkspaceEventType.VideoGenerationUpdated]:
    VideoGenerationUpdatedEventSchema,
  [WorkspaceEventType.StyleComponentUpdated]: StyleComponentUpdatedEventSchema,
  // System control events
  [WorkspaceEventType.Connect]: ConnectEventSchema,
  [WorkspaceEventType.Echo]: EchoEventSchema,
  [WorkspaceEventType.SessionEvicted]: SessionEvictedEventSchema,
  [WorkspaceEventType.Notification]: NotificationEventSchema,
  // Inbox events
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
