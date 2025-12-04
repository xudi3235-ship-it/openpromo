import z from "zod";

/**
 * type def for realtime events used in video gen agent surface
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 *
 * added op_ prefix to avoid collision.
 */
export namespace VideoGenRealtime {
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
  /**
   * core input data schema, powering the video gen as well as
   */
  const SetInputData = z.object({
    prompt: z.string(),
    // brand assets, e.g. logo
    brandAssets: z.string().array(),
    // product images
    productImages: z.string().array(),
    // optional avatar / character image
    avatarImages: z.string().array(),
    // optional style / reference images
    referenceImages: z
      .string()
      .array()
      .describe("optional style/reference images"),
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

  export const ResetState = base.extend({
    type: z.literal("reset_state"),
    data: z.object({}).strict(),
  });

  const Video = z.object({
    id: z.string(),
    videoUrl: z.string(),
  });

  const Image = z.object({
    id: z.string(),
    imageUrl: z.string(),
  });
  // -- agent output schema --
  // used for agent run
  export const AgentOutput = z.object({
    done: z
      .boolean()
      .describe("whether complete, if not, continue the loop run"),
    message: z.string(),
    error: z.string().nullable().optional(),
    // generated assets
    output: z.object({
      videos: Video.array(),
      images: Image.array(),
    }),
  });

  export const AgentName = z.enum(["video_gen_agent", "image_gen_agent"]);
  export type AgentName = z.infer<typeof AgentName>;

  export type AgentOutput = z.infer<typeof AgentOutput>;

  // -- Application State --
  const serverAppState = z.object({
    agent: AgentName,
    status: PipelineStatus,
    lastUpdated: z.string(),
    input: SetInputData,
    logs: z.string().describe("optional logs from agent run"),
    // intermediate artifacts generated in the pipeline
    // during agent run
    artifacts: z.object({
      images: Image.array().optional(),
      videos: Video.array().optional(),
    }),
    // agent output
    output: AgentOutput.optional(),
    // TODO: reuse the agent output zod schema here
    finalVideoUrl: z.string().nullable(),
    error: z.string().nullable(),
  });

  export type ServerAppState = z.infer<typeof serverAppState>;

  export const initialServerAppState: ServerAppState = {
    agent: "video_gen_agent",
    status: "not_started",
    logs: "",
    lastUpdated: new Date().toISOString(),
    input: {
      prompt: "empty prompt",
      productImages: [],
      avatarImages: [],
      referenceImages: [],
      brandAssets: [],
    },
    output: {
      output: {
        videos: [],
        images: [],
      },
      done: false,
      message: "",
    },
    artifacts: {},
    finalVideoUrl: null,
    error: null,
  };

  // -- Server Events --
  export const SyncState = base.extend({
    type: z.literal("sync_state"),
    data: z.object({
      state: serverAppState,
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

  const ClientEvents = z.union([SetInput, StartPipeline, ResetState]);

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
