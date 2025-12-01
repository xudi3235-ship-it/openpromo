import { openai } from "@ai-sdk/openai";
import type { ApiEnv } from "@core/helpers/api-env";

// import { routeAgentRequest } from "agents";

import { type AgentInputItem, RunState, run } from "@openai/agents";
import { VideoGenMessageEvent } from "@shared/agents";
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
import {
  type AgentOutput,
  onToolOutput,
  type ToolNameType,
} from "./agent-types";
import type { VideoGenAgentContext } from "./context";
import { buildSystemPrompt, createVideoGenAgent } from "./create-agent";
import { setupAgentHooks } from "./hooks";

import { toAgentImageInputs } from "./tools/evaluation-utils";
import { buildTreeString, downloadImagesToTmp } from "./utils";

const VIDEO_ASSET_TOOL_NAMES: ToolNameType[] = [
  "veo31_text_to_video",
  "veo31_image_to_video",
  "veo31_reference_images_to_video",
  "veo31_video_extension",
  "sora2_storyboard_generate",
];

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
  VideoGenMessageEvent.ServerAppState
> {
  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.resetState();
  }

  /**
   * Patch the application state with partial updates.
   */
  private patchState(partial: Partial<VideoGenMessageEvent.ServerAppState>) {
    this.setState({
      ...this.state,
      ...partial,
      _internal: {
        ...this.state._internal,
        ...(partial._internal ?? {}),
      },
      lastUpdated: partial.lastUpdated ?? new Date().toISOString(),
    });
  }

  /**
   * core entrypoint to run the video generation pipeline.
   */
  private async runPipeline() {
    // if already running, do not start another

    // 0. mark as running
    this.patchState({
      status: "running",
    });
    const context: VideoGenAgentContext = {
      input: {
        product: "Example Product",
        productImages: this.state.input.productImages,
        business: "small business",
      },
    };
    // 1. create agent with context
    const agent = createVideoGenAgent(context);
    const runnerInput = this.state._internal.serializedRunState
      ? await RunState.fromString(
          agent,
          this.state._internal.serializedRunState,
        )
      : await this.createRunnerInput();

    // 2. setup hooks
    setupAgentHooks(agent, {
      verbose: true,
      onAgentStart: (ctx) => {
        console.log(`[VideoGenAgent] started`, ctx);
      },
      onAgentEnd: (_ctx, output) => {
        console.log(`[VideoGenAgent] ended`, output);
      },
      onToolStart: (_ctx, toolName, details) => {
        console.log(`[VideoGenAgent] Tool started: ${toolName}`, details);
      },
      onToolEnd: (_ctx, toolName, result) => {
        console.log(`[VideoGenAgent] Tool ended: ${toolName}`, result);

        for (const assetTool of VIDEO_ASSET_TOOL_NAMES) {
          onToolOutput(result, assetTool, {
            onSuccess: (output) => {
              console.log(
                `[VideoGenAgent] Received ${assetTool} asset output:`,
                output,
              );
            },
          });
        }

        onToolOutput(result, "nano_banana", {
          onSuccess: (output) => {
            console.log(
              `[VideoGenAgent] Received nano banana asset output:`,
              output,
            );
          },
        });
      },
    });
    // 2. run the agent
    const result = await run(agent, runnerInput, {
      context,
    });
    const finalOutput = result.finalOutput as AgentOutput;
    // 3. update state with serialized run and final output
    this.patchState({
      status: "succeeded",
      finalVideoUrl: finalOutput.finalVideoUrl,
      _internal: {
        ...this.state._internal,
        serializedRunState: result.state.toString(),
      },
    });

    console.log(`[VideoGenAgent] run completed:`, result.finalOutput);
  }

  /**
   * triggered when app state is updated
   */
  async onStateUpdate(
    state: VideoGenMessageEvent.ServerAppState | undefined,
    source: Connection | "server",
  ): Promise<void> {
    console.log(`[VideoGenAgent] onStateUpdate called from`, source, state);
    this.broadcastState();
  }

  // clears stuff
  resetState() {
    this.setState({
      status: "not_started",
      lastUpdated: new Date().toISOString(),
      input: {
        prompt: "empty_prompt",
        productImages: [],
        avatarImages: [],
      },
      _internal: {
        serializedRunState: undefined,
      },
      finalVideoUrl: null,
      error: null,
    });
  }

  private broadcastState() {
    const { _internal, ...rest } = this.state;
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      VideoGenMessageEvent.sendEvent(conn, "sync_state", {
        state: rest,
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
      input: {
        product: "Example Product",
        productImages: [],
        business: "Example Business",
      },
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
    VideoGenMessageEvent.sendEvent(connection, "sync_state", {
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
    await VideoGenMessageEvent.onEvent(message, {
      echo: async (data) => {
        console.log(`[VideoGenAgent] Received echo message:`, data);
        VideoGenMessageEvent.sendEvent(connection, "echo", {
          message: `Echo: ${data.message}`,
        });
      },
      set_input: async (data) => {
        this.patchState({
          input: {
            ...data,
          },
        });
      },
      start_pipeline: async () => {
        await this.runPipeline();
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
  private async createRunnerInput(): Promise<AgentInputItem[]> {
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
