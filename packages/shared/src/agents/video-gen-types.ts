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

  export const RunStatus = [
    "not_started",
    "running",
    "succeeded",
    "failed",
    "canceled",
  ] as const;

  export const RunStatusZod = z.enum(RunStatus);
  export type RunStatus = z.infer<typeof RunStatusZod>;

  // -- Client Events --
  /**
   * core input data schema, powering the video gen as well as
   */
  export const InputSchema = z.object({
    mode: z.enum(["image_gen", "video_gen"]),
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
    // preset ID
    presetId: z.string().nullable().optional(),
  });
  export type Input = z.infer<typeof InputSchema>;

  export const defaultInput: Input = {
    prompt: "empty prompt",
    mode: "video_gen",
    productImages: [],
    avatarImages: [],
    referenceImages: [],
    brandAssets: [],
  };

  export const SetInput = base.extend({
    type: z.literal("set_input"),
    data: InputSchema,
  });

  export const StartPipeline = base.extend({
    type: z.literal("start_pipeline"),
    data: z.object({
      input: InputSchema,
    }),
  });

  export const ResetState = base.extend({
    type: z.literal("reset_state"),
    data: z.object({}).strict(),
  });

  const ArtifactBase = z.object({
    id: z.string(),
    state: z.enum(["processing", "ready", "failed"]).default("processing"),
    progressPercent: z.number().nullable().optional(),
  });

  const Video = ArtifactBase.extend({
    videoUrl: z.string(),
  });

  const Image = ArtifactBase.extend({
    imageUrl: z.string(),
  });

  export const defaultArtifacts = {
    images: [] as z.infer<typeof Image>[],
    videos: [] as z.infer<typeof Video>[],
  };
  // -- agent output schema --
  // used for agent run
  export const AgentOutput = z.object({
    done: z
      .boolean()
      .describe("whether complete, if not, continue the loop run"),
    message: z.string(),
    error: z.string().nullable().optional(),
    // generated assets
    output: z
      .object({
        videos: Video.array(),
        images: Image.array(),
      })
      .describe(
        "final deliverables only. your tool outputs are auto-captured. only include final outputs here.",
      ),
  });

  export type AgentOutput = z.infer<typeof AgentOutput>;
  export const defaultAgentOutput: AgentOutput = {
    done: false,
    message: "",
    output: defaultArtifacts,
    error: null,
  };

  // -- Application State --
  export const serverAppState = z.object({
    status: RunStatusZod,
    runId: z.string().nullable(),
    lastUpdated: z.string(),
    input: InputSchema,
    logs: z.array(z.string()).describe("append-only logs from agent run"),
    // intermediate artifacts generated in the pipeline
    // during agent run
    artifacts: z.object({
      images: Image.array(),
      videos: Video.array(),
    }),
    // agent output
    output: AgentOutput,
    error: z.string().nullable(),
  });

  export type ServerAppState = z.infer<typeof serverAppState>;

  export const initialServerAppState: ServerAppState = {
    status: "not_started",
    runId: null,
    logs: [],
    lastUpdated: new Date().toISOString(),
    input: defaultInput,
    output: defaultAgentOutput,
    artifacts: defaultArtifacts,
    error: null,
  };

  // -- Server Events --

  // Full state broadcast - used for all real-time updates during a run
  export const SyncState = base.extend({
    type: z.literal("sync_state"),
    data: z.object({
      state: serverAppState,
    }),
  });

  // Signals run completion - client should invalidate queries to fetch from DB
  export const RunCompleted = base.extend({
    type: z.literal("run_completed"),
    data: z.object({
      runId: z.string(),
      status: z.enum(["succeeded", "failed"]),
    }),
  });

  const ClientEvents = z.union([SetInput, StartPipeline, ResetState]);

  const ServerEvents = z.union([SyncState, RunCompleted]);

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

/**
 * Orchestrator decision schemas for structured agent handoffs.
 * Used by the orchestrator to route work to sub-agents.
 *
 * Note: Using a flat object with action discriminator instead of z.discriminatedUnion
 * because OpenAI's structured output doesn't support 'union' type directly.
 */
export namespace OrchestratorSchema {
  /** Available sub-agent types (extensible) */
  export const AgentType = z.enum(["image_gen", "video_gen"]);
  export type AgentType = z.infer<typeof AgentType>;

  /** Single step in an execution plan */
  export const PlanStep = z.object({
    stepId: z.string().describe("Unique identifier for this step"),
    agent: AgentType,
    task: z.string().describe("What this step should accomplish"),
    dependsOn: z
      .string()
      .array()
      .nullable()
      .describe("stepIds this step depends on"),
  });
  export type PlanStep = z.infer<typeof PlanStep>;

  /**
   * Flat decision object - OpenAI structured output compatible.
   * Use `action` field to determine which other fields are relevant.
   * Note: OpenAI requires .nullable() for optional fields.
   */
  export const Decision = z.object({
    // Discriminator field
    action: z
      .enum(["plan", "handoff", "retry", "complete", "error", "consult"])
      .describe("The type of decision"),

    // Fields for 'plan' action
    reasoning: z
      .string()
      .nullable()
      .describe("Why this plan makes sense (required for plan action)"),
    steps: PlanStep.array()
      .nullable()
      .describe("Ordered steps to execute (required for plan action)"),

    // Fields for 'handoff' and 'retry' actions
    targetAgent: AgentType.nullable().describe(
      "Which agent to delegate to (required for handoff/retry/consult)",
    ),
    stepId: z
      .string()
      .nullable()
      .describe(
        "Which plan step this fulfills (optional for handoff, required for retry)",
      ),
    taskDescription: z
      .string()
      .nullable()
      .describe(
        "Detailed instructions for the sub-agent (required for handoff/retry)",
      ),

    // Fields for 'consult' action
    consultQuestion: z
      .string()
      .nullable()
      .describe(
        "Question for the video expert (required for consult action). Include: archetype, duration target, whether reference has realistic face.",
      ),

    // Fields for 'complete' action
    output: VideoGenRealtime.AgentOutput.nullable().describe(
      "Final output (required for complete action)",
    ),

    // Fields for 'error' action
    reason: z
      .string()
      .nullable()
      .describe("Why the workflow cannot continue (required for error action)"),
  });

  export type Decision = z.infer<typeof Decision>;

  // Helper types for type narrowing in switch statements
  export type PlanDecision = Decision & { action: "plan" };
  export type HandoffDecision = Decision & { action: "handoff" };
  export type RetryDecision = Decision & { action: "retry" };
  export type CompleteDecision = Decision & { action: "complete" };
  export type ErrorDecision = Decision & { action: "error" };
  export type ConsultDecision = Decision & { action: "consult" };
}
