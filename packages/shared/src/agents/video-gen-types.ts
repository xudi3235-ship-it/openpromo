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
      namespace: z.literal("op_video_gen"),
    })
    .strict();

  const PipelineStatus = z.enum([
    "not_started",
    "running",
    "succeeded",
    "failed",
    "canceled",
  ]);

  // -- Client Events --
  const SetInputData = z.object({
    prompt: z.string(),
    productImages: z.string().array(),
    avatarImages: z.string().array(),
  });

  export const SetInput = base.extend({
    type: z.literal("set_input"),
    data: SetInputData,
  });

  export const StartPipeline = base.extend({
    type: z.literal("start_pipeline"),
    data: z.object({
      input: SetInputData.optional(),
    }),
  });

  // -- Application State --
  const serverAppStateBase = z.object({
    _internal: z.object({
      serializedRunState: z.string().optional(),
      runId: z.string().optional(),
    }),
    status: PipelineStatus,
    lastUpdated: z.string(),
    input: SetInputData,
    finalVideoUrl: z.string().nullable(),
    error: z.string().nullable(),
  });

  export type ServerAppState = z.infer<typeof serverAppStateBase>;

  // -- Server Events --
  export const SyncState = base.extend({
    type: z.literal("sync_state"),
    data: z.object({
      state: serverAppStateBase.omit({ _internal: true }),
    }),
  });

  export const StatusUpdate = base.extend({
    type: z.literal("status_update"),
    data: z.object({
      status: PipelineStatus,
      currentStep: z.string(),
      message: z.string().optional(),
    }),
  });

  export const VideoGenerated = base.extend({
    type: z.literal("video_generated"),
    data: z.object({
      assetId: z.string(),
      videoUrl: z.string(),
      thumbnailUrl: z.string().optional(),
    }),
  });

  export const Echo = base.extend({
    type: z.literal("echo"),
    data: z.object({
      message: z.string(),
    }),
  });

  const ClientEvents = z.union([SetInput, StartPipeline]);

  const ServerEvents = z.union([SyncState, StatusUpdate, VideoGenerated, Echo]);

  export const Event = z.union([ClientEvents, ServerEvents]);
  export type Event = z.infer<typeof Event>;

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
    let parsed: unknown;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_e) {
      return;
    }

    const result = Event.safeParse(parsed);
    if (!result.success) {
      return;
    }

    const event = result.data;
    const handler = handlers[event.type];
    if (handler) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch
      await (handler as any)(event.data);
    }
  }

  function createEvent<K extends Event["type"]>(
    type: K,
    data: EventDataMap[K],
  ): Extract<Event, { type: K }> {
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
