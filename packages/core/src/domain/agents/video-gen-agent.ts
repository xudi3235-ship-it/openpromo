import { openai } from "@ai-sdk/openai";
import type { ApiEnv } from "@core/helpers/api-env";
import { produce } from "immer";

// import { routeAgentRequest } from "agents";

import { type AgentInputItem, RunState, run } from "@openai/agents";
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
import { type AgentOutput, onToolOutput } from "./agent-types";
import type { VideoGenAgentContext } from "./context";
import { buildSystemPrompt, createVideoGenAgent } from "./create-agent";
import { setupAgentHooks } from "./hooks";

import { toAgentImageInputs } from "./tools/evaluation-utils";
import { buildTreeString, downloadImagesToTmp } from "./utils";

const VIDEO_ASSET_TOOL_NAMES = [
  "veo31_text_to_video",
  "veo31_image_to_video",
  "veo31_reference_images_to_video",
  "veo31_video_extension",
  "sora2_storyboard_generate",
] as const;

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
  private runStateSerialized: string | null = null;
  private _logs: string = "";

  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.runStateSerialized = null;
    this._logs = "";
  }

  /**
   * Patch the application state with partial updates.
   */
  private patchState(
    updater: (draft: VideoGenRealtime.ServerAppState) => void,
  ) {
    this.setState(
      produce(this.state, (draft) => {
        updater(draft);
        draft.lastUpdated = new Date().toISOString();
      }),
    );
  }

  private async runPipeline() {
    return this.withStateMgmt(async () => {
      await this.runPipelineImpl();
    });
  }
  // biome-ignore lint/suspicious/noExplicitAny: ok
  private log(msg: string, ...args: any[]) {
    const formattedMsg = `[${VideoGenAgent.name}] ${msg} ${JSON.stringify(args)}`;
    console.log(formattedMsg, ...args);
    this._logs += `${formattedMsg}\n`;
  }

  // either from serialize state or create new
  private async createRunnerInput(): Promise<AgentInputItem[]> {
    if (!this.runStateSerialized) {
      // new
      return await this.createRunnerInitialInput();
    }
    // from serialized
    const state = await RunState.fromString(
      createVideoGenAgent(),
      this.runStateSerialized,
    );
    return [
      ...state.history,
      // captures latest msg
      await this.createRunnerInitialInput(),
    ];
  }

  /**
   * core entrypoint to run the video generation pipeline.
   */
  private async runPipelineImpl() {
    const context: VideoGenAgentContext = {
      input: this.state.input,
    };
    // 1. create agent with context
    const agent = createVideoGenAgent();
    // finalized input items
    const runnerInput = await this.createRunnerInput();

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
                  url: output.videoUrl,
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
                url: output.imageUrl,
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
    const finalOutput = result.finalOutput as AgentOutput;
    // 3. update state with serialized run and final output
    this.patchState((draft) => {
      draft.status = "succeeded";
      draft.finalVideoUrl = finalOutput.finalVideoUrl ?? null;
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
    this.patchState((draft) => {
      draft.status = "running";
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
      start_pipeline: async () => {
        await this.runPipeline();
      },
      reset_state: async () => {
        console.log(`[VideoGenAgent] reset_state requested`);
        this.resetState();
      },
    });
  }

  private async ensureFilesExists() {
    return await Promise.all([
      await downloadImagesToTmp(
        this.state.input.productImages,
        "/tmp/products",
      ),
      await downloadImagesToTmp(this.state.input.avatarImages, "/tmp/avatar"),
    ]);
  }

  /**
   * create initial run input items
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

    const userContent: AgentInputItem["content"] = [
      {
        type: "input_text" as const,
        text: `Product reference files stored under /tmp/products. Local paths: ${productImagePaths.join(", ")}.\nAvatar references stored under /tmp/avatar. Local paths: ${avatarImagePaths.join(", ")}.`,
      },
      ...productImages,
      {
        type: "input_text" as const,
        text: "Avatar reference selection:",
      },
      ...avatarImages,
      {
        type: "input_text" as const,
        text: `Latest tmp dir snapshot (cwd=/tmp):\n${VideoGenAgent.tmpDirStr}`,
      },
      {
        type: "input_text" as const,
        text: `user input: ${this.state.input.prompt}`,
      },
    ];
    const userMessage: AgentInputItem = {
      role: "user",
      content: userContent,
    };

    return [userMessage];
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
}
