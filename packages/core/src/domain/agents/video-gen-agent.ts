import { openai } from "@ai-sdk/openai";
import type { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import {
  type Agent,
  type AgentInputItem,
  RunContext,
  RunState,
  run,
  withTrace,
} from "@openai/agents";
import { type OrchestratorSchema, VideoGenRealtime } from "@shared/agents";
import {
  type AgentContext,
  type Connection,
  type ConnectionContext,
  getCurrentAgent,
  type WSMessage,
} from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import { produce } from "immer";
import { EntAgentRun } from "../agent-run";
import type { VideoGenAgentContext } from "./context";
import { AGENT_REGISTRY } from "./create-agent";
import { createOrchestratorAgent } from "./create-orchestrator-agent";
import { buildSystemPrompt } from "./create-video-agent";
import { setupAgentHooks } from "./hooks";
import { InputTransformer } from "./input/input-transformer";
import { Presets } from "./presets";
import { ActorStore } from "./state/actor-store";
import { StateBroadcaster } from "./transport/state-broadcaster";
import { WebSocketHandler } from "./transport/websocket-handler";
// extra props for agent instantiation.
export interface VideoGenAgentProps {
  actor: Actor.WorkspaceUser;
}

/**
 * Main entrypoint for video generation agent.
 * Ported from Python main_agent.py
 *
 * Uses Cloudflare Agents framework (AIChatAgent) with OpenAI Agents SDK.
 * Cloudflare provides durable lifecycles, websockets, etc.
 * OpenAI Agents sdk is used for business logic, orchestration, etc.
 *
 */
export class VideoGenAgent extends AIChatAgent<
  ApiEnv,
  VideoGenRealtime.ServerAppState
> {
  // internal states
  private runStateSerialized: string | null;
  private actorStore: ActorStore;
  private presetManager: Presets.Manager;
  private inputTransformer: InputTransformer;
  private _suppressBroadcast = false;

  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.runStateSerialized = null;
    this.actorStore = new ActorStore(ctx);
    this.presetManager = new Presets.Manager();
    this.inputTransformer = new InputTransformer(
      this.actorStore,
      this.presetManager,
    );

    // if not initialized, init
    if (!this.state) {
      this.setState(VideoGenRealtime.initialServerAppState);
    }

    this.ctx.blockConcurrencyWhile(async () => {
      await this.actorStore.get();
    });
  }

  // sets the actor ctx for DO execution
  // DO has in memory api as well as storage, we persist actor in storage
  async setActor(actor: Actor.WorkspaceUser) {
    await this.actorStore.set(actor);
    // console.log(`[VideoGenAgent] Actor set:`, actor);
    await this.withActor(() => Promise.resolve());
  }

  private async withActor<T>(fn: () => Promise<T>): Promise<T> {
    return this.actorStore.withContext(fn);
  }

  /**
   * Patch the application state with partial updates.
   */
  async patchState(updater: (draft: VideoGenRealtime.ServerAppState) => void) {
    const newState = produce(this.state, (draft) => {
      updater(draft);
      draft.lastUpdated = new Date().toISOString();
    });

    this.setState(newState);

    // Broadcast state to all connected clients
    const connections = this.ctx.getWebSockets();
    StateBroadcaster.broadcastState(connections, newState);

    // Note: DB persistence is handled only in persistFinalState() at run completion
    // to avoid race conditions between multiple async writes
  }

  private async runPipeline() {
    await this.withActor(() =>
      withTrace(VideoGenAgent.name, async () => {
        return this.withRunLifecycle(async () => {
          await this.runPipelineImpl();
        });
      }),
    );
  }

  private castProps(_props?: Record<string, unknown>): VideoGenAgentProps {
    const props = _props as unknown as VideoGenAgentProps;
    return props;
  }

  /**
   * Validate input before starting a run.
   */
  private validateInput(input: VideoGenRealtime.Input): {
    valid: boolean;
    error?: string;
  } {
    if (input.productImages.length === 0) {
      return {
        valid: false,
        error: "No product images provided in input.",
      };
    }
    if (input.prompt.length === 0 && input.presetId === null) {
      return {
        valid: false,
        error: "No prompt provided in input.",
      };
    }
    return { valid: true };
  }

  /**
   * Manage state lifecycle for a run execution.
   * Handles validation, run creation, status transitions, and error handling.
   */
  private async withRunLifecycle<T>(
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    // Check if already running
    if (this.state.status === "running") {
      console.warn(
        "[VideoGenAgent] withRunLifecycle called but already running",
      );
      return;
    }

    // Validate input
    const validation = this.validateInput(this.state.input);
    if (!validation.valid) {
      console.error(`[VideoGenAgent] Invalid input: ${validation.error}`);
      await this.patchState((draft) => {
        draft.status = "failed";
        draft.error = validation.error ?? "Invalid input";
      });
      return;
    }

    // Reset internal state before starting
    this.runStateSerialized = null;
    await this.patchState((draft) => {
      draft.logs = [];
      draft.artifacts = VideoGenRealtime.defaultArtifacts;
      draft.output = VideoGenRealtime.defaultAgentOutput;
    });

    // Create run and mark as running
    const run = await EntAgentRun.createFromState(this.state);
    await this.patchState((draft) => {
      draft.status = "running";
      draft.runId = run.data.id;
    });

    try {
      // Execute the run
      const result = await fn();
      return result;
    } catch (error) {
      // Mark as failed
      await this.patchState((draft) => {
        draft.status = "failed";
        draft.error =
          typeof error === "string" ? error : (error as Error).message;
      });
      throw error;
    } finally {
      // Capture final state before any reset
      const runId = this.state.runId;
      const finalStatus = this.state.status;

      if (runId && (finalStatus === "succeeded" || finalStatus === "failed")) {
        // 1. AWAIT persistence to DB (critical - ensures DB has correct state)
        await this.persistFinalState(runId, this.state);
        console.log(`in finally, finaloutput: `, this.state.output);

        // 2. Broadcast run_completed (tells clients to invalidate queries)
        this.broadcastRunCompleted(runId, finalStatus);
      }

      // 3. Reset DO state quietly (no broadcast)
      // Clients will fetch final state from DB via invalidated queries
      this.resetStateQuietly();
    }
  }

  onStart(_props?: Record<string, unknown> | undefined) {
    const props = this.castProps(_props);
    // console.log(`[VideoGenAgent] onStart called with props:`, props);
    if (props?.actor) {
      this.setActor(props.actor);
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: ok
  private log(msg: string, ...args: any[]) {
    const formattedMsg = `[${VideoGenAgent.name}] ${msg} ${JSON.stringify(args)}`;
    console.log(formattedMsg, ...args);
    this.patchState((draft) => {
      draft.logs.push(formattedMsg);
    }).catch(console.error);
  }

  // either from serialize state or create new
  private async createRunnerInput(
    // biome-ignore lint/suspicious/noExplicitAny: Agent output types vary
    agent: Agent<VideoGenAgentContext, any>,
  ): Promise<AgentInputItem[]> {
    if (!this.runStateSerialized) {
      // new
      return await this.inputTransformer.transform(this.state.input);
    }
    // from serialized
    const state = await RunState.fromString(agent, this.runStateSerialized);
    return [
      ...state.history,
      // captures latest msg
      ...(await this.inputTransformer.transform(this.state.input)),
    ];
  }

  /**
   * core entrypoint to run the video generation pipeline.
   * Uses decision-based routing with structured orchestrator output.
   */
  private async runPipelineImpl() {
    const runtimeContext = new RunContext<VideoGenAgentContext>({
      input: this.state.input,
      stage: "create_plan",
      plan: "",
    });

    // 1. create orchestrator agent
    const orchestrator = createOrchestratorAgent();
    const runnerInput = await this.createRunnerInput(orchestrator);

    // 2. setup hooks for orchestrator
    // @ts-expect-error
    setupAgentHooks(orchestrator, {
      onAgentStart: (_ctx, agent) => {
        this.log(`${agent.name} started`);
      },
      onAgentEnd: (_ctx, output) => {
        this.log(`ended`, output);
      },
      onToolStart: (_ctx, toolName, details) => {
        this.log(`Tool started: ${toolName}`, details);
      },
      onToolEnd: (_ctx, toolName, result) => {
        this.log(`Tool ended: ${toolName}`, result);
      },
    });

    // Track execution state
    let currInput: AgentInputItem[] = runnerInput;
    let step = 0;
    const MAX_RUN_STEPS = 100;
    let _currentPlan: OrchestratorSchema.PlanStep[] | null = null;
    const completedSteps = new Map<string, unknown>();

    // 3. Decision-based run loop
    while (step < MAX_RUN_STEPS) {
      this.log(`Step ${step}: Running orchestrator`);
      console.log(`>>>> Orchestrator step ${step} >>>>`);
      console.log(`>>>> last 2 input:`, JSON.stringify(currInput.slice(-2)));

      const orchestratorResult = await run(orchestrator, currInput, {
        context: runtimeContext,
      });

      // Serialize state for recovery
      this.runStateSerialized = orchestratorResult.state.toString();
      const decision =
        orchestratorResult.finalOutput as OrchestratorSchema.Decision;

      this.log(`Decision: ${decision.action}`, decision);

      // 4. Route based on decision type
      switch (decision.action) {
        case "plan": {
          // Store the plan for tracking
          const steps = decision.steps ?? [];
          _currentPlan = steps;
          console.log(`Current plan:`, _currentPlan);
          this.log(
            `Plan created with ${steps.length} steps: ${decision.reasoning ?? "no reasoning"}`,
          );

          // Acknowledge plan and prompt for first handoff
          currInput = [
            ...orchestratorResult.history,
            {
              role: "system",
              content: `Plan acknowledged with ${steps.length} steps. Proceed with first step handoff.`,
            },
          ];
          break;
        }

        case "handoff":
        case "retry": {
          const targetAgent = decision.targetAgent;
          const taskDescription = decision.taskDescription ?? "";

          if (!targetAgent) {
            throw new Error("Handoff/retry decision missing targetAgent");
          }

          this.log(`Handoff to ${targetAgent}: ${taskDescription}`);

          try {
            // Get agent factory from registry
            const agentFactory = AGENT_REGISTRY[targetAgent];
            const subAgent = agentFactory();

            // Setup hooks for sub-agent
            setupAgentHooks(subAgent, {
              onAgentStart: (_ctx, agent) => {
                this.log(`[SubAgent] ${agent.name} started`);
              },
              onAgentEnd: (_ctx, output) => {
                this.log(`[SubAgent] ended`, output);
              },
              onToolStart: (_ctx, toolName, details) => {
                this.log(`[SubAgent] Tool started: ${toolName}`, details);
              },
              onToolEnd: (_ctx, toolName, result) => {
                this.log(`[SubAgent] Tool ended: ${toolName}`, result);
              },
            });
            const productInputs = await this.inputTransformer.fromProductImages(
              this.state.input,
            );

            const presetMsgs = await this.presetManager.getByIDToAgentInput(
              this.state.input.presetId,
            );

            // Run sub-agent with task description
            const subInput: AgentInputItem[] = [
              // 1. product imgs
              ...productInputs,
              // 2. generated imgs
              ...(await this.inputTransformer.fromImageArtifacts(this.state)),
              // 3. preset context if any
              ...presetMsgs,
              {
                role: "system",
                content: `current task from orchestrator:
                ${taskDescription}`,
              },
            ];
            // console.log(`Running sub-agent ${targetAgent} with input:`, {
            //   taskDescription,
            //   items: JSON.stringify(subInput),
            // });

            const subResult = await run(subAgent, subInput, {
              context: runtimeContext,
            });

            // Track completed step
            if (decision.stepId) {
              completedSteps.set(decision.stepId, subResult.finalOutput);
            }

            // Feed result back to orchestrator
            currInput = [
              // TODO: maybe we need to re-feed the images here so orchestrator
              // can evaluate?
              ...orchestratorResult.history,
              ...(await this.inputTransformer.fromImageArtifacts(this.state)),
              {
                role: "system",
                content: `Sub-agent ${targetAgent} completed successfully.\nResult: ${JSON.stringify(subResult.finalOutput)}.
                Current completed steps: ${JSON.stringify(completedSteps)}
                `,
              },
            ];
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            this.log(`Sub-agent ${targetAgent} failed: ${errorMsg}`);

            // On failure, let orchestrator decide (retry or error)
            currInput = [
              ...orchestratorResult.history,
              {
                role: "system",
                content: `Sub-agent ${targetAgent} FAILED.\nError: ${errorMsg}\nOrchestrator: decide whether to retry with different approach or abort.`,
              },
            ];
          }
          break;
        }

        case "consult": {
          // Orchestrator is consulting video_gen for expert advice before finalizing plan
          const consultQuestion = decision.consultQuestion;
          if (!consultQuestion) {
            throw new Error("Consult decision missing consultQuestion");
          }

          this.log(`Consulting video_gen: ${consultQuestion}`);

          try {
            // Get video gen agent factory (consultation mode - no execution expected)
            const agentFactory = AGENT_REGISTRY.video_gen;
            const consultAgent = agentFactory();

            // Setup hooks for consultation
            setupAgentHooks(consultAgent, {
              onAgentStart: (_ctx, agent) => {
                this.log(`[Consult] ${agent.name} started`);
              },
              onAgentEnd: (_ctx, output) => {
                this.log(`[Consult] ended`, output);
              },
            });

            // Build consultation input - provide context for advice
            const productInputs = await this.inputTransformer.fromProductImages(
              this.state.input,
            );

            const consultInput: AgentInputItem[] = [
              ...productInputs,
              {
                role: "system",
                content: `<consultation_request>
You are being consulted for expert advice BEFORE execution. Do NOT execute any tools.
Provide structured advice based on the question below.

Question from orchestrator:
${consultQuestion}

Input context:
- Mode: ${this.state.input.mode}
- Prompt: ${this.state.input.prompt}
- Has reference images: ${this.state.input.referenceImages.length > 0}
- Has avatar images: ${this.state.input.avatarImages.length > 0}

Respond with structured advice including:
1. Recommended tool(s) with reasoning
2. Segment strategy (single shot vs multi-segment)
3. Keyframe requirements (face constraints, composition)
4. Warnings/constraints to consider
</consultation_request>`,
              },
            ];

            const consultResult = await run(consultAgent, consultInput, {
              context: runtimeContext,
              maxTurns: 1, // Single turn for consultation - no tool execution
            });

            // Feed advice back to orchestrator
            currInput = [
              ...orchestratorResult.history,
              {
                role: "system",
                content: `Video expert consultation complete.
Advice: ${JSON.stringify(consultResult.finalOutput)}

Now finalize your plan incorporating this advice. Output a "plan" action.`,
              },
            ];
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            this.log(`Consultation failed: ${errorMsg}`);

            // On consultation failure, proceed without advice
            currInput = [
              ...orchestratorResult.history,
              {
                role: "system",
                content: `Consultation failed: ${errorMsg}. Proceed with plan using your best judgment.`,
              },
            ];
          }
          break;
        }

        case "complete": {
          // Workflow finished successfully
          const output = decision.output;
          if (!output) {
            throw new Error("Complete decision missing output");
          }
          this.log(`Workflow complete`, output);

          await this.patchState((draft) => {
            draft.status = "succeeded";
            draft.output = output;
          });
          return; // Exit the loop
        }

        case "error": {
          // Workflow cannot continue
          throw new Error(
            `Orchestrator error: ${decision.reason ?? "unknown"}`,
          );
        }
      }

      step++;
    }

    // Exceeded max steps
    throw new Error(`Exceeded maximum run steps (${MAX_RUN_STEPS})`);
  }

  /**
   * triggered when app state is updated
   */
  async onStateUpdate(
    _state: VideoGenRealtime.ServerAppState | undefined,
    _source: Connection | "server",
  ): Promise<void> {
    if (this._suppressBroadcast) return;
    // Broadcast current state to all connected clients
    const connections = this.ctx.getWebSockets();
    StateBroadcaster.broadcastState(connections, this.state);
  }

  /**
   * Persist final state to database (awaited to ensure consistency)
   */
  private async persistFinalState(
    runId: string,
    state: VideoGenRealtime.ServerAppState,
  ) {
    try {
      const run = await EntAgentRun.fromID(runId);
      await run.persistState(state);
      console.log(`[VideoGenAgent] Final state persisted for run ${runId}`);
    } catch (err) {
      console.error(
        `[VideoGenAgent] Failed to persist final state for run ${runId}:`,
        err,
      );
    }
  }

  /**
   * Broadcast run_completed event to all clients
   * This signals clients to invalidate queries and fetch from DB
   */
  private broadcastRunCompleted(runId: string, status: "succeeded" | "failed") {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      VideoGenRealtime.sendEvent(
        conn as unknown as WebSocket,
        "run_completed",
        {
          runId,
          status,
        },
      );
    }
    console.log(`[VideoGenAgent] Broadcasted run_completed for ${runId}`);
  }

  /**
   * Reset state without broadcasting (quiet reset)
   * Used after run completion to clear DO state without confusing clients
   */
  private resetStateQuietly() {
    this._suppressBroadcast = true;
    this.setState(VideoGenRealtime.initialServerAppState);
    this._suppressBroadcast = false;
    this.runStateSerialized = null;
    this.messages = [];
    console.log(`[VideoGenAgent] State reset quietly (no broadcast)`);
  }

  /**
   * Reset state with broadcast - used for explicit user reset
   */
  resetState() {
    this.resetStateQuietly();
    // Broadcast the reset state for explicit resets
    const connections = this.ctx.getWebSockets();
    StateBroadcaster.broadcastState(connections, this.state);
  }

  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal },
  ) {
    console.log(`[VideoGenAgent] onChatMessage called`);
    const runtimeContext = new RunContext<VideoGenAgentContext>({
      input: this.state.input,
      stage: "create_plan",
      plan: "",
    });
    const systemPrompt = buildSystemPrompt(runtimeContext.context);
    const messages = this.messages;

    console.log(
      `[VideoGenAgent] messages for streamText:`,
      JSON.stringify(messages),
    );

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        console.log(`[VideoGenAgent] Creating message stream`);
        const result = streamText({
          system: systemPrompt,
          messages: convertToModelMessages(this.messages),
          model: openai("gpt-5-mini"),
          // TODO: Add tools here once ported
          // tools: { ... },
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<ToolSet>,
          stopWhen: stepCountIs(10),
        });

        console.log(`[VideoGenAgent] Merging stream with writer`);
        writer.merge(result.toUIMessageStream());
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  // https://developers.cloudflare.com/agents/api-reference/websockets/
  // for websocket features
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    console.log(`[VideoGenAgent] onConnect called`);
    // Connections are automatically accepted by the SDK.
    // You can also explicitly close a connection here with connection.close()
    // Access the Request on ctx.request to inspect headers, cookies and the URL
    await super.onConnect(connection, ctx);

    // Only sync if there's an ACTIVE run
    // For completed runs, client will rely on DB via React Query
    if (this.state.status === "running" && this.state.runId) {
      console.log(
        `[VideoGenAgent] Syncing active run ${this.state.runId} to new connection`,
      );
      StateBroadcaster.syncToNewConnection(
        connection,
        this.state,
        this.messages as UIMessage[],
      );
    } else {
      // Send idle state - client will rely on DB for historical data
      console.log(`[VideoGenAgent] No active run, sending idle state`);
      VideoGenRealtime.sendEvent(
        connection as unknown as WebSocket,
        "sync_state",
        {
          state: {
            ...VideoGenRealtime.initialServerAppState,
            status: "not_started",
          },
        },
      );
    }
  }

  /**
   * handles incoming ws message, we will provide our custom message types here.
   */
  async onMessage(connection: Connection, message: WSMessage) {
    await WebSocketHandler.handleMessage(connection, message, {
      onSetInput: async (data) => {
        this.patchState((draft) => {
          draft.input = data;
        });
      },
      onStartPipeline: async (data) => {
        // Input is now required in start_pipeline
        this.patchState((draft) => {
          draft.input = data.input;
        });
        await this.runPipeline();
      },
      onResetState: async () => {
        this.resetState();
      },
    } satisfies WebSocketHandler.EventHandlers);
  }

  /**
   * uses async local storage
   * @param updater
   */
  static onProgressUpdate(
    updater: (draft: VideoGenRealtime.ServerAppState) => void,
  ) {
    const { agent } = getCurrentAgent<VideoGenAgent>();
    agent?.patchState(updater);
  }

  /**
   * Upsert or update a video artifact.
   * - Matches existing artifact by `videoUrl` or `id`.
   * - If found, merges provided fields; otherwise pushes a new artifact.
   */
  static updateVideoArtifact(opts: {
    id: string;
    videoUrl?: string;
    state?: VideoGenRealtime.ServerAppState["artifacts"]["videos"][number]["state"];
    progressPercent?: number | null;
  }) {
    const { agent } = getCurrentAgent<VideoGenAgent>();
    agent?.patchState((draft) => {
      if (!draft.artifacts) draft.artifacts = VideoGenRealtime.defaultArtifacts;
      const artifact = draft.artifacts.videos.find(
        (a) =>
          (opts.videoUrl && a.videoUrl === opts.videoUrl) || a.id === opts.id,
      );
      if (artifact) {
        if (opts.videoUrl !== undefined) artifact.videoUrl = opts.videoUrl;
        if (opts.state !== undefined) artifact.state = opts.state;
        if (opts.progressPercent !== undefined)
          artifact.progressPercent = opts.progressPercent;
      } else {
        draft.artifacts.videos.push({
          id: opts.id,
          videoUrl: opts.videoUrl ?? "",
          state: opts.state ?? "processing",
          progressPercent: opts.progressPercent ?? null,
        });
      }
      draft.lastUpdated = new Date().toISOString();
    });
  }

  /**
   * Upsert or update an image artifact.
   */
  static updateImageArtifact(opts: {
    id: string;
    imageUrl?: string;
    state?: VideoGenRealtime.ServerAppState["artifacts"]["images"][number]["state"];
    progressPercent?: number | null;
  }) {
    const { agent } = getCurrentAgent<VideoGenAgent>();
    agent?.patchState((draft) => {
      if (!draft.artifacts) draft.artifacts = VideoGenRealtime.defaultArtifacts;
      const artifact = draft.artifacts.images.find(
        (a) =>
          (opts.imageUrl && a.imageUrl === opts.imageUrl) || a.id === opts.id,
      );
      if (artifact) {
        if (opts.imageUrl !== undefined) artifact.imageUrl = opts.imageUrl;
        if (opts.state !== undefined) artifact.state = opts.state;
        if (opts.progressPercent !== undefined)
          artifact.progressPercent = opts.progressPercent;
      } else {
        draft.artifacts.images.push({
          id: opts.id,
          imageUrl: opts.imageUrl ?? "",
          state: opts.state ?? "processing",
          progressPercent: opts.progressPercent ?? null,
        });
      }
      draft.lastUpdated = new Date().toISOString();
    });
  }
}
