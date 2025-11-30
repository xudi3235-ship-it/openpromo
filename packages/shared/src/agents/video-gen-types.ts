import z from "zod";

/**
 * type def for realtime events used in video gen agent surface
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 *
 * added op_ prefix to avoid collision.
 */
export namespace VideoGenMessageEvent {
  const base = z
    .object({
      // namespace to avoid collision with other agents
      namespace: z.literal("op_video_gen"),
    })
    .strict();
  // -- Client Events --

  // set input needed for video generation
  export const SetInput = base.extend({
    type: z.literal("set_input"),
    data: z.object({
      prompt: z.string(),
      productID: z.string(),
      avatarImageUrl: z.string().optional(),
      additionalAssetUrls: z.array(z.string()).optional(),
    }),
  });

  // user provides feedback on a generated keyframe
  export const ReviewKeyframe = base.extend({
    type: z.literal("review_keyframe"),
    data: z.object({
      keyframeUrl: z.string(),
      action: z.enum(["approve", "reject", "regenerate"]),
      feedback: z.string().optional(),
    }),
  });

  // trigger video generation after keyframes are finalized
  export const StartVideoGeneration = base.extend({
    type: z.literal("start_video"),
    data: z.object({
      selectedKeyframeUrl: z.string(),
      motionPrompt: z.string().optional(),
    }),
  });

  // -- Application State --

  export type VideoGenState = {
    status:
      | "idle"
      | "generating_keyframes"
      | "waiting_for_review"
      | "generating_video"
      | "completed"
      | "failed";
    prompt: string | null;
    productID: string | null;
    avatarImageUrl: string | null;
    generatedKeyframes: Array<{
      id: string;
      url: string;
      prompt: string;
      status: "pending" | "approved" | "rejected";
    }>;
    finalVideoUrl: string | null;
    error: string | null;
  };

  // -- Server Events --

  // sync state from server to client
  export const SyncState = base.extend({
    type: z.literal("sync_state"),
    data: z.object({
      state: z.custom<VideoGenState>(),
    }),
  });

  // status update
  export const StatusUpdate = base.extend({
    type: z.literal("status_update"),
    data: z.object({
      status: z.enum([
        "idle",
        "generating_keyframes",
        "waiting_for_review",
        "generating_video",
        "completed",
        "failed",
      ]),
      message: z.string().optional(),
    }),
  });

  // keyframe generated event
  export const KeyframeGenerated = base.extend({
    type: z.literal("keyframe_generated"),
    data: z.object({
      keyframeUrl: z.string(),
      altText: z.string().optional(),
    }),
  });

  // video generated event
  export const VideoGenerated = base.extend({
    type: z.literal("video_generated"),
    data: z.object({
      videoUrl: z.string(),
      thumbnailUrl: z.string().optional(),
    }),
  });

  // error event
  export const VideoGenError = base.extend({
    type: z.literal("error"),
    data: z.object({
      code: z.string(),
      message: z.string(),
    }),
  });

  // echo event for testing
  export const Echo = base.extend({
    type: z.literal("echo"),
    data: z.object({
      message: z.string(),
    }),
  });

  // union of all event types
  export const Event = z.union([
    SetInput,
    ReviewKeyframe,
    StartVideoGeneration,
    SyncState,
    StatusUpdate,
    KeyframeGenerated,
    VideoGenerated,
    VideoGenError,
    Echo,
  ]);
  export type Event = z.infer<typeof Event>;

  // Helper type to map event type to its data payload
  export type EventDataMap = {
    [K in Event["type"]]: Extract<Event, { type: K }>["data"];
  };

  export type Handlers = {
    [K in Event["type"]]?: (data: EventDataMap[K]) => void | Promise<void>;
  };

  export async function onEvent(
    raw: string | unknown,
    handlers: Handlers,
  ): Promise<void> {
    // 1. parse raw and zod safe parse
    let parsed: unknown;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_e) {
      // fallback, might not be our event
      return;
    }

    const result = Event.safeParse(parsed);
    if (!result.success) {
      // fallback, might not be our event
      return;
    }

    const event = result.data;
    const handler = handlers[event.type];
    if (handler) {
      // type cast needed for dynamic dispatch, now passing event.data
      // The `as any` cast is used here to satisfy TypeScript's strictness
      // while maintaining the dynamic dispatch by key.
      // biome-ignore lint/suspicious/noExplicitAny: ok
      await (handler as any)(event.data);
    }
  }

  // New function to create type-safe events
  function createEvent<K extends Event["type"]>(
    type: K,
    data: EventDataMap[K],
  ): Extract<Event, { type: K }> {
    // enforce namespace
    return { type, data, namespace: "op_video_gen" } as Extract<
      Event,
      { type: K }
    >;
  }

  export function sendEvent<K extends Event["type"]>(
    connection: WebSocket,
    type: K,
    data: EventDataMap[K],
  ) {
    const event = createEvent(type, data as EventDataMap[K]);
    connection.send(JSON.stringify(event));
  }
}
