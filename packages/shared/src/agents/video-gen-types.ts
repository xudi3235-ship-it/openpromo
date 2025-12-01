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
    "idle",
    "collecting_input",
    "generating_keyframes",
    "waiting_for_review",
    "generating_video",
    "completed",
    "failed",
  ]);

  const AssetKind = z.enum(["image", "video"]);
  const AssetStatus = z.enum(["pending", "ready", "failed"]);
  const AssetDecision = z.enum([
    "pending",
    "approved",
    "rejected",
    "regenerate",
  ]);

  export const GeneratedAsset = z.object({
    id: z.string(),
    kind: AssetKind,
    status: AssetStatus,
    url: z.string().url().nullable(),
    thumbnailUrl: z.string().url().nullable(),
    label: z.string().optional(),
    decision: AssetDecision.optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

  export type GeneratedAsset = z.infer<typeof GeneratedAsset>;

  const PendingActionType = z.enum([
    "confirm_keyframes",
    "confirm_video",
    "retry_required",
  ]);

  export const PendingAction = z.object({
    id: z.string().optional(),
    type: PendingActionType,
    assetIds: z.array(z.string()).min(1),
    title: z.string(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  });

  export type PendingAction = z.infer<typeof PendingAction>;

  // -- Client Events --
  const SetInputData = z.object({
    prompt: z.string(),
    productImages: z.string().array(),
    avatarImages: z.string().array(),
    additionalAssetUrls: z.array(z.string()).optional(),
    motionPrompt: z.string().optional(),
  });

  export const SetInput = base.extend({
    type: z.literal("set_input"),
    data: SetInputData,
  });

  export const StartPipeline = base.extend({
    type: z.literal("start_pipeline"),
    data: z.object({
      resumeFromAssetId: z.string().optional(),
    }),
  });

  export const SubmitAction = base.extend({
    type: z.literal("submit_action"),
    data: z.object({
      action: z.enum([
        "approve_keyframe",
        "reject_keyframe",
        "regenerate_keyframe",
        "continue_with_asset",
        "approve_video",
        "reject_video",
        "retry_video_generation",
        "dismiss_action",
      ]),
      assetIds: z.array(z.string()).min(1),
      feedback: z.string().optional(),
    }),
  });

  export type SubmitActionPayload = z.infer<typeof SubmitAction>["data"];

  export const CancelRun = base.extend({
    type: z.literal("cancel_run"),
    data: z.object({ reason: z.string().optional() }).optional(),
  });

  export const RequestHistory = base.extend({
    type: z.literal("request_history"),
    data: z.object({ limit: z.number().min(1).max(25).optional() }),
  });

  // Legacy compatibility events
  export const StartImageGen = base.extend({
    type: z.literal("start_image_gen"),
    data: z.object({
      input: SetInputData,
    }),
  });

  export const ReviewKeyframe = base.extend({
    type: z.literal("review_keyframe"),
    data: z.object({
      keyframeUrl: z.string(),
      action: z.enum(["approve", "reject", "regenerate"]),
      feedback: z.string().optional(),
    }),
  });

  export const StartVideoGeneration = base.extend({
    type: z.literal("start_video"),
    data: z.object({
      selectedKeyframeUrl: z.string(),
      motionPrompt: z.string().optional(),
    }),
  });

  // -- Application State --
  const StageSnapshot = z.enum(["image_gen", "video_gen"]);

  const serverAppStateBase = z.object({
    _internal: z.object({
      serializedRunState: z.string().optional(),
      runId: z.string().optional(),
      imageRunState: z.string().optional(),
      videoRunState: z.string().optional(),
      lastStage: StageSnapshot.optional(),
      selectedKeyframeIds: z.array(z.string()).optional(),
    }),
    status: PipelineStatus,
    currentStep: z.string(),
    lastUpdated: z.string(),
    pendingAction: PendingAction.nullable(),
    input: SetInputData,
    assets: z.array(GeneratedAsset),
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

  export const AssetAdded = base.extend({
    type: z.literal("asset_added"),
    data: z.object({ asset: GeneratedAsset }),
  });

  export const AssetUpdated = base.extend({
    type: z.literal("asset_updated"),
    data: z.object({ asset: GeneratedAsset }),
  });

  export const AssetProgress = base.extend({
    type: z.literal("asset_progress"),
    data: z.object({
      assetId: z.string(),
      status: AssetStatus.optional(),
      message: z.string().optional(),
    }),
  });

  export const ActionRequired = base.extend({
    type: z.literal("action_required"),
    data: z.object({ action: PendingAction }),
  });

  export const HistorySnapshot = base.extend({
    type: z.literal("history_snapshot"),
    data: z.object({ assets: z.array(GeneratedAsset) }),
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

  const ClientEvents = z.union([
    SetInput,
    StartPipeline,
    SubmitAction,
    CancelRun,
    RequestHistory,
    StartImageGen,
    ReviewKeyframe,
    StartVideoGeneration,
  ]);

  const ServerEvents = z.union([
    SyncState,
    StatusUpdate,
    AssetAdded,
    AssetUpdated,
    AssetProgress,
    ActionRequired,
    HistorySnapshot,
    VideoGenerated,
    Echo,
  ]);

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
