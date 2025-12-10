import { openai } from "@ai-sdk/openai";
import { type ApiEnv, Binding } from "@core/helpers/api-env";

// import { routeAgentRequest } from "agents";

import { Actor } from "@core/helpers/actor";
import {
  type Agent,
  type AgentInputItem,
  RunContext,
  RunState,
  run,
  withTrace,
} from "@openai/agents";
import { VideoGenRealtime } from "@shared/agents";
import type {
  AgentContext,
  Connection,
  ConnectionContext,
  WSMessage,
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
import type { VideoGenAgentContext } from "./context";
import { buildSystemPrompt, createVideoGenAgent } from "./create-agent";
import { setupAgentHooks } from "./hooks";
import { InputTransformer } from "./input/input-transformer";
import { Presets } from "./presets";
import { ActorStore } from "./state/actor-store";
import { AppStateManager } from "./state/app-state-manager";
import { createImageGenWithRefAgent } from "./subagents/image-gen-with-ref";
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
  private _logs: string;
  private actorStore: ActorStore;
  private presetManager: Presets.Manager;
  private inputTransformer: InputTransformer;
  private stateManager: AppStateManager;

  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.runStateSerialized = null;
    this._logs = "";
    this.actorStore = new ActorStore(ctx);
    this.presetManager = new Presets.Manager();
    this.inputTransformer = new InputTransformer(this.presetManager);

    // if not initialized, init
    if (!this.state) {
      this.setState(VideoGenRealtime.initialServerAppState);
    }

    // Initialize state manager with getters/setters (single source of truth)
    this.stateManager = new AppStateManager(
      () => this.state,
      (state) => this.setState(state),
      (state) => {
        const connections = this.ctx.getWebSockets();
        StateBroadcaster.broadcastState(connections, state);
      },
    );

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
  patchState(updater: (draft: VideoGenRealtime.ServerAppState) => void) {
    this.stateManager.patchState(updater);
  }

  private async runPipeline() {
    await this.withActor(() =>
      withTrace(VideoGenAgent.name, async () => {
        return this.withStateMgmt(async () => {
          await this.runPipelineImpl();
        });
      }),
    );
  }

  private castProps(_props?: Record<string, unknown>): VideoGenAgentProps {
    const props = _props as unknown as VideoGenAgentProps;
    return props;
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
    this._logs += `${formattedMsg}\n`;
  }

  // either from serialize state or create new
  private async createRunnerInput(
    agent: Agent<VideoGenAgentContext, VideoGenRealtime.AgentOutput>,
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
   */
  private async runPipelineImpl() {
    const runtimeContext = new RunContext<VideoGenAgentContext>({
      input: this.state.input,
      stage: "create_plan",
      plan: "",
    });
    // 1. create agent with context
    const agent =
      this.state.input.mode === "video_gen"
        ? createVideoGenAgent()
        : createImageGenWithRefAgent();
    // finalized input items
    const runnerInput = await this.createRunnerInput(agent);

    // 2. setup hooks
    setupAgentHooks(agent, {
      onAgentStart: (_ctx) => {
        this.log(`started`);
      },
      onAgentEnd: (_ctx, output) => {
        this.log(`ended`, output);
      },
      onToolStart: (_ctx, toolName, _details) => {
        this.log(`Tool started: ${toolName}`);
      },
      onToolEnd: (_ctx, toolName, result) => {
        this.log(`Tool ended: ${toolName}`, result);
      },
    });
    let currInput = runnerInput;
    let step = 0;
    const MAX_RUN_STEPS = 20;
    // 2. run the agent
    // TODO: utilize agent handoff using structural output
    while (step < MAX_RUN_STEPS) {
      console.log(`>>>> Agent: ${this.state.input.mode} run step ${step} >>>>`);
      console.log(`>>>> last 2 input:`, JSON.stringify(currInput.slice(-2)));
      console.log(
        `>>>> agent tools:`,
        agent.tools.map((t) => t.name),
      );
      const result = await run(agent, currInput, {
        context: runtimeContext,
      });
      // serialize run state
      this.runStateSerialized = result.state.toString();
      const finalOutput = result.finalOutput as VideoGenRealtime.AgentOutput;
      if (!finalOutput.done) {
        console.log(`continuing run, not done yet...`);
        // prepare next input
        currInput = [
          ...result.history,
          // TODO: might instrument more info here during each run to avoid losing context.
          {
            role: "system",
            content: `<end_of_step> end of step ${step}, continue to next step run. above is the action item and needs execution.`,
          },
        ];
        step++;
        continue;
      }
      // done
      // 3. update state with serialized run and final output
      this.patchState((draft) => {
        draft.status = "succeeded";
        draft.output = finalOutput;
        draft.logs = this._logs;
      });
      this.log(`run completed:`, result.finalOutput);
      // exit
      break;
    }
  }

  private async withStateMgmt<T>(fn: () => Promise<T>) {
    return this.stateManager.withRunLifecycle(
      this.state.input,
      () => {
        // Reset internal state before starting a new run
        this.runStateSerialized = null;
        this._logs = "";
      },
      fn,
    );
  }

  /**
   * triggered when app state is updated
   */
  async onStateUpdate(
    _state: VideoGenRealtime.ServerAppState | undefined,
    _source: Connection | "server",
  ): Promise<void> {
    this.stateManager.broadcastState();
  }

  // clears stuff
  resetState() {
    this.stateManager.resetState(VideoGenRealtime.initialServerAppState, () => {
      this.runStateSerialized = null;
      this._logs = "";
      // Reset chat history
      this.messages = [];
    });
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

    // Sync state and messages to newly connected client
    StateBroadcaster.syncToNewConnection(
      connection,
      this.state,
      this.messages as UIMessage[],
    );
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

  // wip
  async _startImageGenWorkflow() {
    this.ctx.id; // current durable object id
    const workflow = await Binding.use().ImageGenerationWorkflow.create({
      params: {
        actor: Actor.assert("workspace_user"),
        generationId: "TODO",
      },
    });
    return workflow;
  }
}
