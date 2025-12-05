import { openai } from "@ai-sdk/openai";
import { type ApiEnv, Binding } from "@core/helpers/api-env";
import { produce } from "immer";

// import { routeAgentRequest } from "agents";

import { Actor } from "@core/helpers/actor";
import {
  type Agent,
  type AgentInputItem,
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
import { MessageType as CfAgentMessageType } from "agents/ai-types";
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
import { EntAgentRun } from "../agent-run";
import { onToolOutput } from "./agent-types";
import type { VideoGenAgentContext } from "./context";
import { buildSystemPrompt, createVideoGenAgent } from "./create-agent";
import { setupAgentHooks } from "./hooks";
import { createImageGenWithRefAgent } from "./subagents/image-gen-with-ref";
import { toAgentImageInputs } from "./tools/evaluation-utils";
import { buildTreeString, downloadImagesToTmp } from "./utils";

const VIDEO_ASSET_TOOL_NAMES = [
  "veo31_text_to_video",
  "veo31_image_to_video",
  "veo31_reference_images_to_video",
  "veo31_video_extension",
  "sora2_storyboard_generate",
] as const;

class ActorStore {
  private cache: Actor.WorkspaceUser | null = null;
  private readonly key = "actor";

  constructor(private ctx: AgentContext) {}

  async get(): Promise<Actor.WorkspaceUser | null> {
    if (this.cache) return this.cache;
    const storedActor = await this.ctx.storage.get(this.key);
    if (!storedActor) return null;
    this.cache = storedActor as Actor.WorkspaceUser;
    return this.cache;
  }

  async set(actor: Actor.WorkspaceUser) {
    this.cache = actor;
    await this.ctx.storage.put(this.key, actor);
  }

  async withContext<T>(fn: () => Promise<T>): Promise<T> {
    const actor = await this.get();
    if (!actor) throw new Error("Actor not set on VideoGenAgent");
    return Actor.provide("workspace_user", actor.properties, fn);
  }
}

// extra props for agent instantiation.
export interface VideoGenAgentProps {
  actor: Actor.WorkspaceUser;
}

/**
 * core design of the video gen agent
 * Input: product images, avatar images, prompt
 *
 * Internally, it runs the pipeline to
 * 1. create image keyframes using the assets(product, brand, etc.).
 * 2. generate video segments from keyframes. Either sora2 long video one shot, or image-to-video short clips, extension or stitching.
 * 3. compose final video
 *
 * Image Gen workflow
 * Input: product images, reference images, prompt, ...(optionally more assets, style reference, etc)
 * 1. asset lib, gather, select assets
 * 2. create image, might be batch
 *
 */

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

  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.runStateSerialized = null;
    this._logs = "";
    this.actorStore = new ActorStore(ctx);
    // if not initialized, init
    if (!this.state) {
      this.setState(VideoGenRealtime.initialServerAppState);
    }
    this.ctx.blockConcurrencyWhile(async () => {
      const actor = await this.actorStore.get();
      console.log(`[VideoGenAgent] actor resolved:`, actor);
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
  private patchState(
    updater: (draft: VideoGenRealtime.ServerAppState) => void,
  ) {
    const newState = produce(this.state, (draft) => {
      updater(draft);
      draft.lastUpdated = new Date().toISOString();
    });
    this.setState(newState);
    if (!this.state.runId) return;
    // persist state
    EntAgentRun.fromID(this.state.runId)
      .then((run) => {
        run.persistState(newState);
      })
      .catch((err) => {
        // might be deleted
        console.error(
          `[VideoGenAgent] Failed to persist state for run ${this.state.runId}:`,
          err,
        );
      });
  }

  private async runPipeline(params: { agent: VideoGenRealtime.AgentName }) {
    await this.withActor(() =>
      withTrace(VideoGenAgent.name, async () => {
        return this.withStateMgmt(async () => {
          await this.runPipelineImpl(params);
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
    console.log(`[VideoGenAgent] onStart called with props:`, props);
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
      return await this.createRunnerInitialInput();
    }
    // from serialized
    const state = await RunState.fromString(agent, this.runStateSerialized);
    return [
      ...state.history,
      // captures latest msg
      await this.createRunnerInitialInput(),
    ];
  }

  /**
   * core entrypoint to run the video generation pipeline.
   */
  private async runPipelineImpl(params: { agent: VideoGenRealtime.AgentName }) {
    const context: VideoGenAgentContext = {
      input: this.state.input,
    };
    // 1. create agent with context
    const agent =
      params.agent === "video_gen_agent"
        ? createVideoGenAgent()
        : createImageGenWithRefAgent();
    // finalized input items
    const runnerInput = await this.createRunnerInput(agent);

    // 2. setup hooks
    setupAgentHooks(agent, {
      verbose: true,
      onAgentStart: (_ctx) => {
        this.log(`started`);
      },
      onAgentEnd: (_ctx, output) => {
        this.log(`ended`, output);
      },
      onToolStart: (_ctx, toolName, details) => {
        this.log(`Tool started: ${toolName}`, details);
      },
      onToolEnd: (_ctx, toolName, result) => {
        this.log(`Tool ended: ${toolName}`, result);

        for (const assetTool of VIDEO_ASSET_TOOL_NAMES) {
          onToolOutput(result, assetTool, {
            onSuccess: (output) => {
              this.log(`Received ${assetTool} asset output:`, output.videoUrl);
              this.patchState((draft) => {
                if (!draft.artifacts.videos) {
                  draft.artifacts.videos = [];
                }
                draft.artifacts.videos.push({
                  id: `${assetTool}_${Date.now()}`,
                  videoUrl: output.videoUrl,
                });
              });
            },
          });
        }

        onToolOutput(result, "nano_banana", {
          onSuccess: (output) => {
            this.log(`Received nano banana asset output:`, output);
            this.patchState((draft) => {
              if (!draft.artifacts.images) {
                draft.artifacts.images = [];
              }
              draft.artifacts.images.push({
                id: `nano_banana_${Date.now()}`,
                imageUrl: output.imageUrl,
              });
            });
          },
        });
      },
    });
    // 2. run the agent
    const result = await run(agent, runnerInput, {
      context,
    });
    // serialize run state
    this.runStateSerialized = result.state.toString();
    const finalOutput = result.finalOutput as VideoGenRealtime.AgentOutput;
    // 3. update state with serialized run and final output
    this.patchState((draft) => {
      draft.status = "succeeded";
      draft.output = finalOutput;
      draft.logs = this._logs;
    });

    this.log(`run completed:`, result.finalOutput);

    console.log(`logs:\n${this._logs}`);
  }

  private async withStateMgmt<T>(fn: () => Promise<T>) {
    // if already running, no-op
    if (this.state.status === "running") {
      console.warn("[VideoGenAgent] withStateMgmt called but already running");
      return;
    }

    // if no valid input or images, error out
    if (
      this.state.input.productImages.length === 0 ||
      this.state.input.prompt.length === 0
    ) {
      console.error(
        "[VideoGenAgent] runPipeline called but no product images provided",
      );
      this.patchState((draft) => {
        draft.status = "failed";
        draft.error = "No product images or prompt provided in input.";
      });
      return;
    }
    // 0. mark as running
    const run = await EntAgentRun.createFromState(this.state);
    this.patchState((draft) => {
      draft.status = "running";
      draft.runId = run.data.id;
    });
    try {
      // 1. run the fn
      const result = await fn();
      // 2. mark as succeeded?
      this.patchState((draft) => {
        draft.status = "succeeded";
      });
      return result;
    } catch (error) {
      // 3. failed
      this.patchState((draft) => {
        draft.status = "failed";
        draft.error = (error as Error).message;
      });
      throw error;
    }
  }

  /**
   * triggered when app state is updated
   */
  async onStateUpdate(
    _state: VideoGenRealtime.ServerAppState | undefined,
    _source: Connection | "server",
  ): Promise<void> {
    this.broadcastState();
  }

  // clears stuff
  resetState() {
    this.runStateSerialized = null;
    this._logs = "";
    // Reset chat history and app state
    this.messages = [];
    this.setState(VideoGenRealtime.initialServerAppState);
    this.broadcastState();
  }

  private broadcastState() {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      VideoGenRealtime.sendEvent(conn, "sync_state", {
        state: this.state,
      });
    }
  }

  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal },
  ) {
    console.log(`[VideoGenAgent] onChatMessage called`);
    // TODO: Extract runtime context from messages or agent state
    const runtimeContext: VideoGenAgentContext = {
      input: this.state.input,
    };
    const systemPrompt = buildSystemPrompt(runtimeContext);
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

    // Manually sync messages to client on connection
    this.syncChatMessages(connection);

    // Sync application state
    VideoGenRealtime.sendEvent(connection, "sync_state", {
      state: this.state,
    });
  }

  private syncChatMessages(connection: Connection) {
    if (this.messages.length === 0) return;
    console.log(
      `[VideoGenAgent] Syncing ${this.messages.length} messages to connection`,
    );
    connection.send(
      JSON.stringify({
        type: CfAgentMessageType.CF_AGENT_CHAT_MESSAGES,
        messages: this.messages as UIMessage[],
      }),
    );
  }

  /**
   * handles incoming ws message, we will provide our custom message types here.
   */
  async onMessage(connection: Connection, message: WSMessage) {
    console.log(`[VideoGenAgent] onMessage called with:`, message);
    // 2. Then handle our custom video gen events
    await this.handleWebsocketMessages(connection, message);
  }

  /**
   * internal handlers for typesafe ws message events
   */
  private async handleWebsocketMessages(
    connection: Connection,
    message: WSMessage,
  ) {
    if (typeof message !== "string") {
      console.warn(
        `[VideoGenAgent] Received non-string message, ignoring:`,
        message,
      );
      return;
    }
    await VideoGenRealtime.onEvent(message, {
      echo: async (data) => {
        console.log(`[VideoGenAgent] Received echo message:`, data);
        VideoGenRealtime.sendEvent(connection, "echo", {
          message: `Echo: ${data.message}`,
        });
      },
      set_input: async (data) => {
        this.patchState((draft) => {
          draft.input = data;
        });
      },
      set_agent: async (data) => {
        this.log(`[VideoGenAgent] switching agent to ${data.agent}`);
        this.runStateSerialized = null;
        this.patchState((draft) => {
          Object.assign(draft, VideoGenRealtime.initialServerAppState);
          draft.agentName = data.agent;
        });
      },
      start_pipeline: async (data) => {
        // Input is now required in start_pipeline
        this.patchState((draft) => {
          draft.input = data.input;
        });
        await this.runPipeline({
          agent: this.state.agentName,
        });
      },
      reset_state: async () => {
        console.log(`[VideoGenAgent] reset_state requested`);
        this.resetState();
      },
    });
  }

  private async ensureFilesExists() {
    return await Promise.all([
      downloadImagesToTmp(this.state.input.productImages, "/tmp/products"),
      downloadImagesToTmp(this.state.input.avatarImages, "/tmp/avatar"),
      downloadImagesToTmp(this.state.input.referenceImages, "/tmp/reference"),
      downloadImagesToTmp(this.state.input.brandAssets, "/tmp/brand"),
    ]);
  }

  /**
   * shared logic to tranform input to agent input items.
   * used for both video gen and image gen agents
   */
  private async createRunnerInitialInput(): Promise<AgentInputItem[]> {
    console.log(`[VideoGenAgent] Creating input from state`, this.state);

    const [productImagePaths, avatarImagePaths] =
      await this.ensureFilesExists();
    console.log(
      `[VideoGenAgent] Product images downloaded to:`,
      productImagePaths,
    );
    console.log(
      `[VideoGenAgent] Avatar images downloaded to:`,
      avatarImagePaths,
    );

    const productImages = toAgentImageInputs(this.state.input.productImages);
    const avatarImages = toAgentImageInputs(this.state.input.avatarImages);
    const referenceImages = toAgentImageInputs(
      this.state.input.referenceImages,
    );
    const brandAssets = toAgentImageInputs(this.state.input.brandAssets);

    const messages: AgentInputItem[] = [];

    if (productImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: `Product reference files stored under /tmp/products. Local paths: ${productImagePaths.join(", ")}`,
          },
          ...productImages,
        ],
      });
    }

    if (avatarImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: `Avatar references stored under /tmp/avatar. Local paths: ${avatarImagePaths.join(", ")}`,
          },
          ...avatarImages,
        ],
      });
    }

    if (referenceImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: "Additional reference images:",
          },
          ...referenceImages,
        ],
      });
    }

    if (brandAssets.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: "Brand assets:",
          },
          ...brandAssets,
        ],
      });
    }

    messages.push({
      role: "user",
      content: [
        {
          type: "input_text" as const,
          text: `Latest tmp dir snapshot (cwd=/tmp):\n${VideoGenAgent.tmpDirStr}`,
        },
      ],
    });

    messages.push({
      role: "user",
      content: [
        {
          type: "input_text" as const,
          text: `user input: ${this.state.input.prompt}`,
        },
      ],
    });

    return messages;
  }

  /**
   * Get the current structure of the tmp directory as a string.
   * Uses node:fs which is available in Cloudflare Workers VFS.
   */
  static get tmpDirStr(): string {
    try {
      // Use the VFS tmp path where we symlink/copy files
      const tmpBasePath = "/tmp";
      return `${tmpBasePath}/\n${buildTreeString(tmpBasePath, "")}`;
    } catch {
      return "Unable to read tmp directory structure";
    }
  }

  // wip
  async startImageGenWorkflow() {
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
