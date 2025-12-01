import { openai } from "@ai-sdk/openai";
import type { ApiEnv } from "@core/helpers/api-env";

// import { routeAgentRequest } from "agents";

import { Agent, type AgentInputItem, RunState, run } from "@openai/agents";
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
import { AgentOutput, onToolOutput } from "./agent-types";
import { PRIMARY_GOAL, VIDEO_TYPES_REGISTRY } from "./constants";
import type { VideoGenAgentContext } from "./context";
import { setupAgentHooks } from "./hooks";
import { StaticPrompts } from "./prompts";
import {
  evaluateImageTool,
  // evaluateVideoInputTool,
  nanoBananaTool,
  sora2StoryboardTool,
  veo31ImageToVideoTool,
  veo31ReferenceImagesToVideoTool,
  veo31TextToVideoTool,
  veo31VideoExtensionTool,
  videoGenShellTool,
} from "./tools";
import { toAgentImageInputs } from "./tools/evaluation-utils";
import { buildTreeString, downloadImagesToTmp } from "./utils";

type AssetDecision = NonNullable<
  VideoGenMessageEvent.GeneratedAsset["decision"]
>;

type AgentStage = "image_gen" | "video_gen";

type StageOptions = {
  resume?: boolean;
  assetIds?: string[];
};

/**
 * Build the system prompt for video generation agent.
 * Ported from Python main_agent.py create_main_agent()
 */
function buildSystemPrompt(context?: VideoGenAgentContext): string {
  const contextSection = context
    ? `
    ## CURRENT CONTEXT
    ${JSON.stringify(context, null, 2)}
    `
    : "";

  return `
    You are expert in social media visuals, ads creatives.
    ${contextSection}
    1. PRIMARY GOAL
    ${PRIMARY_GOAL}
    2. SCOPE
    * Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels. Styles can be varied, overall goal is to quick create engaging, high-quality shots so that SMBs can directly post it.
    * shell tool runs in /tmp directory by default. Product image inputs are in the /tmp/products folder (relative to cwd). You *must* use paths from /tmp dir since it's writable and ephemeral to our worker runtime. Due to worker limit, shell cmd might not be implemented fully. 
    * nano_banana is used for image generation. it can take image inputs with great accuracy, details, follow docs/guide.
    * veo3.1 is used for video generation. We have specific tools for different modes. closely follow each tools' guide, pros/cons and other supplementary docs to best utilize them. we almost never use text to video directly. 
    * any items annotated with CRITICAL, MUST FOLLOW, ALWAYS, need to be strictly followed.

    3. ABOUT IMAGE GENERATION
    - when generating images, ALWAYS use the product image as input to ensure product is clearly visible.
    - feel free to generate a couple different images with differnt prompts, if they are part of the complex shots needed for longer video.
    - image prompt needs to be ultra-detailed, this is critical.
    - start with non-pro model param, evaluate, then use pro model for finalized higher-quality img.
    - use <negative_prompt> section to explicitly state what to avoid in the image, this is useful to avoid unwanted artifacts, issues. E.g. distorted logos, weird physics, etc.

    4. ABOUT VIDEO GENERATION
    - veo3.1 can only create up to 8s video at a time!! this is critical, so this means the image generation, storyboard, eveyrhting need to be planned around this constraint. Longer videos can be achieved by extending prev one, or creating mutliple videos, use your reasoning and specific use cases to decide best approach.
    - camera movements, transitions be smooth, creative, and authentic.
    - **FOR NOW, don't add texts, it's not accurate enough yet.
    - stiching videos is less preferred compared to extension, however it might be suitable for some cases. in that case, generate different videos with veo3.1, then use shell tool to stich with ffmpeg.
    - when extending video, it's critical to ensure continuity, this applies to both visual, narrative flow, and audio! think carefully when crafting the extension prompt.
    - when creating veo3.1 prompt, you can add a <negative_prompt> section to explicity state what to avoid in the video. this is useful to avoid unwanted artifacts, issues. E.g. distorted logos, weird physics, etc.
    - for reference object accuracy, ingridients, use \`veo31_reference_images_to_video\` with reference images as input. Note that this tool requires 16:9 aspect ratio.
    - ensure the scene cuts are not weird, abrupt, unintuitive.
    - the prompt needs to be ultra-detailed and clear, create it to your best ability.

    4.1 VIDEO STRUCTURE
    - ALWAYS start with strong hook in the first 3-6 seconds, to grab attention!! as this is the most critical for social media shorts ads. 

    4.1.1 tiktok style UGC video tips & pitfalls
    - extension tool often loses accuracy referencing specific objects, logos, etc. it's good for coherent continuation. For shots where product needs to clearly featured, use image-to-video with specific keyframes instead.
    - strong, effecitve, opening. Right on point hook. retention is critical for first 3-6 s. Optimize for our topline metrics.
    - natural, authentic dialogue that feels real, not scripted. avoid buzzwords, cliches, over-the-top claims.

    
    4.2 VIDEO TYPES, REFERENCE REGISTRY
    CRITICAL, MUST FOLLOW
    ${VIDEO_TYPES_REGISTRY}

    4.2 ABOUT DIFFERENT VIDEO TOOLS
    - video extension: prompt + previous video as input for continuation. Pros: best continuity, cons: might lose precision on the elements referenced
    - image to video: start frame, (last frame) + prompt as input. Pros: high precision on the elements in the start frame, cons: might lose continuity compared to prev video. interpolation works for some cases.
    - reference images to video: reference images + prompt as input. Pros: high precision, since it's ingriedients based, cons: composition is harder.
    - for veo31 tools, prefer to use kie ai provider for higher rate limit.

    - Known issues & Best practices:
        - need to think carefully about extension prompt, as we tried standard shot-based breakdown and it's not really working well, loses context from prev video segment. see how we can enhance that by either more context, tweaking prev video ending shot, etc.
        - for UGC style videos, depends on the storyboard, for multiple differtn scenes, cuts. sometimes  it's better to create a bunch of start frames, and create multiple segments then stitch together, this is good workaround to ensure object / refernce accuracy, since you can use image edit capabiltiy to create a single keyframe first, then prompt the edits with *different inputs.
        - Rule of thumb: for compelx scenes, multiple cuts, extension might not work, consider image-to-video with multiple keyframes instead.
        - Overall, you can combine differtn tools, approaches to achieve the best results, use your reasoning to decide.



    4.3 ABOUTE HIGH LEVEL VIDEO TYPES & BLUEPRINT
    overall we prioritize time-savings for SMBs on social media, so we focus on videos that are most frequently and is suitable for us to produce quickly meanwhile it fits with the product, social media platform trends and preferences, etc.

    A couple video types that work well:
    1. pure product demo shots, different angles, studio lit -> show case the features, details, texture, etc.
    2. UGC styles, pov-style, tiktok-style, shot on iphone style, talking to camera, holding product, explaining features, CRITICAL -- it does not feel like an ad, it feels authentic, raw, real. For UGC, you need to clearly specifcy the setting(BG, props, env, lighting etc), the person(demographics, clothing, hairstyle, tone, mannerism, etc), the dialogue(script), the camera movements(shots, angles, transitions, etc).
    3. lifestyle shots, product in use in real life scenarios, e.g. kitchen, outdoors, gym, etc.
    4. comparison shots, e.g. before and after using the product, side by side comparison with competitors, etc.
    5. creative shots, e.g. stop motion, hyperlapse, slow motion, etc. that features special effects, to show ingridients, features, etc. Suitable products: beuaty, food, beverage, etc.

    It's critical to use reasoning to see what's best fit for product, target users, etc. The categories are non-exhaustive, feel free to combine, enhance, and create new styles that fits the product and social media trends.


    5. TASKS
    - analyze inputs, understand product, selling points, and target audience.
    - pick the best fitting image reference, and *preferrably use the reference + product image as input to craft a image(nano banana) following the docs guide. ALWAYS use product image as input when creating image. This will be key start frame for the product demo video. IF image generation failed due to internal server error, retry it once, if still fails, report failure and stop.
    - evaluate the generated images using the evaluate_image tool to ensure they meet quality and relevance criteria, and make adjustments, depends on feedback you can either regenerate, or use image input to \`edit\` the previously generated image to fix issues with small tweaks. ONLY NEED TO RUN THIS ONCE!!
    - create effective, ultra-detailed veo3.1 prompt(s) with the new image to create product demo video segment(s). might use differnt combination of tools to create sub-shots, later finalize the video by extending, combining, etc.
    - choose the correct veo3.1 tool based on the specific task (text-to-video, image-to-video, extension, or reference-images), pros/cons, and other considerations mentioned above.


    <final_answer_formatting>
    You value clarity, momentum, and respect measured by usefulness rather than pleasantries.
    - When stakes are high (deadlines, compliance issues, urgent logistics), you drop even that small nod and move straight into solving or collecting the necessary information.
    - Core inclination:
    - You speak with grounded directness. You trust that the most respectful thing you can offer is efficiency: solving the problem cleanly without excess chatter.
    - You never repeat acknowledgments. Once you've signaled understanding, you pivot fully to the task.
    </final_answer_formatting>


    ## additional resources
    ### general prompt guide for image gen
    ${StaticPrompts.generalImagePromptGuide()}
    ### nano banana guide
    ${StaticPrompts.nanoBananaGuide()}
    ### veo3.1 guide
    ${StaticPrompts.veo31Guide()}
    ### good veo3.1 prompt examples
    ${StaticPrompts.goodVeo31PromptExamples()}
    ### good nano banana prompt examples
    ${StaticPrompts.goodNanoBananaPromptExamples()}
    ### additional guidelines about UGC videos
    - slightly faster paces on both dialogue and scene cuts movements, since our duration is very limited.
    - ensure the cuts are not abrupt, hard to understand. many times when we use \`hard cut\` during shots transitons, it feels very weird, like it continues the emotion/dialogue, but the scene changes abruptly, which is jarring. prefer smooth transitions use other prompts / techniques to address this.
    - ensure physics is correct, e.g. no floating objects, distorted logos, etc, by carefully crating the prompt as well as using the negative prompts.
    - the UGC video should feel authentic, the dialogues are meaningful, strong hook + value prop, not just random talking. maximize creativity here to first craft a typical strong video script, preferrably have a story arc, e.g. problem -> solution -> benefit, etc. or rumor, surprise, etc. then think about how to best visualize it with camera movements, shots, angles, etc. Ultimately you are the owner here to create engaging, eye-grabbing ugc style "ad" video that feels authentic and real.
    `;
}

/**
 * Create the OpenAI Agents SDK agent with typed context.
 * Tools will be added here once ported.
 * WIP: not ready, still figuring out how th fs works in CF worker, it's pretty
 * limited compared to Modal runtime.
 */
function createVideoGenAgent(context: VideoGenAgentContext) {
  const agent = new Agent<VideoGenAgentContext, AgentOutput>({
    name: "VideoGenInternalAgent",
    model: "gpt-5.1",
    instructions: buildSystemPrompt(context),
    tools: [
      videoGenShellTool,
      evaluateImageTool,
      // evaluateVideoInputTool, // not good yet
      nanoBananaTool,
      veo31TextToVideoTool,
      veo31ImageToVideoTool,
      veo31ReferenceImagesToVideoTool,
      veo31VideoExtensionTool,
      sora2StoryboardTool,
    ],
    modelSettings: {
      reasoning: {
        effort: "medium",
        summary: "auto",
      },
    },
    // @ts-expect-error weird zod typing issue
    outputType: AgentOutput,
  });
  return agent;
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
  VideoGenMessageEvent.ServerAppState
> {
  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    this.resetState();
  }

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

  private broadcastEvent<K extends VideoGenMessageEvent.Event["type"]>(
    type: K,
    data: VideoGenMessageEvent.EventDataMap[K],
  ) {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      VideoGenMessageEvent.sendEvent(conn as unknown as WebSocket, type, data);
    }
  }

  private updateStatus(
    status: VideoGenMessageEvent.EventDataMap["status_update"]["status"],
    currentStep: string,
    message?: string,
  ) {
    this.patchState({ status, currentStep });
    this.broadcastEvent("status_update", { status, currentStep, message });
  }

  private setPendingAction(
    action: VideoGenMessageEvent.PendingAction | null,
  ): void {
    this.patchState({ pendingAction: action });
    if (action) {
      this.broadcastEvent("action_required", { action });
    }
  }

  private upsertAsset(asset: VideoGenMessageEvent.GeneratedAsset): void {
    const exists = this.state.assets.some((a) => a.id === asset.id);
    const assets = exists
      ? this.state.assets.map((a) => (a.id === asset.id ? asset : a))
      : [...this.state.assets, asset];
    this.patchState({ assets });
    this.broadcastEvent(exists ? "asset_updated" : "asset_added", { asset });
  }

  private handleImageAssets(urls: string[]): void {
    if (!urls.length) return;
    const timestamp = new Date().toISOString();
    const assetIds: string[] = [];
    urls.forEach((url, index) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `image-${Date.now()}-${index}`;
      assetIds.push(id);
      const asset: VideoGenMessageEvent.GeneratedAsset = {
        id,
        kind: "image",
        status: "ready",
        url,
        thumbnailUrl: url,
        createdAt: timestamp,
        updatedAt: timestamp,
        decision: "pending",
      };
      this.upsertAsset(asset);
    });
    this.updateStatus("waiting_for_review", "awaiting_keyframe_feedback");
    this.setPendingAction({
      id: `pa-${Date.now()}`,
      type: "confirm_keyframes",
      assetIds,
      title: "Review generated keyframes",
      description: "Approve a keyframe to continue to video generation.",
    });
  }

  private handleVideoAsset(videoUrl: string): void {
    const timestamp = new Date().toISOString();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `video-${Date.now()}`;
    const asset: VideoGenMessageEvent.GeneratedAsset = {
      id,
      kind: "video",
      status: "ready",
      url: videoUrl,
      thumbnailUrl: videoUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.upsertAsset(asset);
    this.patchState({ finalVideoUrl: videoUrl });
    this.updateStatus("completed", "video_ready");
    this.broadcastEvent("video_generated", {
      assetId: id,
      videoUrl,
      thumbnailUrl: videoUrl,
    });
    this.setPendingAction({
      id: `pa-${Date.now()}`,
      type: "confirm_video",
      assetIds: [id],
      title: "Review generated video",
      description: "Approve the rendered cut or retry for improvements.",
    });
  }

  private async startImageGeneration(options?: { resume?: boolean }) {
    this.setPendingAction(null);
    this.updateStatus("generating_keyframes", "preparing_keyframes");
    try {
      await this.executeStage("image_gen", { resume: options?.resume });
    } catch (error) {
      console.error("[VideoGenAgent] image generation failed", error);
      this.patchState({
        error: error instanceof Error ? error.message : String(error),
      });
      this.updateStatus("failed", "image_stage_error");
    }
  }

  private async startVideoGeneration(options?: StageOptions) {
    const selectedAssets = this.resolveKeyframeSelection(options?.assetIds);
    if (!selectedAssets.length) {
      console.warn(
        "[VideoGenAgent] No approved keyframes to start video stage",
      );
      return;
    }
    const selectedIds = selectedAssets.map((asset) => asset.id);
    this.patchState({
      _internal: {
        ...this.state._internal,
        selectedKeyframeIds: selectedIds,
      },
    });
    this.setPendingAction(null);
    this.updateStatus("generating_video", "rendering_video");
    try {
      await this.executeStage("video_gen", {
        ...options,
        assetIds: selectedIds,
      });
    } catch (error) {
      console.error("[VideoGenAgent] video generation failed", error);
      this.patchState({
        error: error instanceof Error ? error.message : String(error),
      });
      this.updateStatus("failed", "video_stage_error");
    }
  }

  private resolveKeyframeSelection(assetIds?: string[]) {
    const explicitIds = assetIds?.length
      ? assetIds
      : (this.state._internal.selectedKeyframeIds ?? []);
    const candidates = explicitIds.length
      ? this.state.assets.filter(
          (asset) => explicitIds.includes(asset.id) && asset.kind === "image",
        )
      : this.state.assets.filter(
          (asset) => asset.kind === "image" && asset.status === "ready",
        );
    return candidates;
  }

  private async executeStage(stage: AgentStage, options?: StageOptions) {
    const context: VideoGenAgentContext = {
      input: {
        product: "Example Product",
        productImages: this.state.input.productImages,
        business: "small business",
      },
    };

    const agent = createVideoGenAgent(context);
    const resumeKey = stage === "image_gen" ? "imageRunState" : "videoRunState";
    const resumeState = this.state._internal[resumeKey];
    const shouldResume = Boolean(options?.resume && resumeState);
    const runnerInput = shouldResume
      ? await RunState.fromString(agent, resumeState as string)
      : await this.createStageInput(stage, options);

    setupAgentHooks(agent, {
      verbose: true,
      onAgentStart: (ctx) => {
        console.log(`[VideoGenAgent] ${stage} stage started`, ctx);
      },
      onAgentEnd: (_ctx, output) => {
        console.log(`[VideoGenAgent] ${stage} stage ended`, output);
      },
      onToolStart: (_ctx, toolName, details) => {
        console.log(`[VideoGenAgent] Tool started: ${toolName}`, details);
      },
      onToolEnd: (_ctx, toolName, result) => {
        console.log(`[VideoGenAgent] Tool ended: ${toolName}`, result);
        onToolOutput(result, "video_gen", {
          onSuccess: (output) => {
            this.handleVideoAsset(output.videoUrl);
          },
        });
        onToolOutput(result, "image_gen", {
          onSuccess: (output) => {
            this.handleImageAssets(output.imageUrls);
          },
        });
        onToolOutput(result, "nano_banana", {
          onSuccess: (output) => {
            this.handleImageAssets([output.imageUrl]);
          },
        });
      },
    });

    const result = await run(agent, runnerInput, {
      context,
    });
    const serialized = result.state.toString();
    const updatedInternal = {
      ...this.state._internal,
      serializedRunState: serialized,
      lastStage: stage,
    } as typeof this.state._internal;
    if (stage === "image_gen") {
      updatedInternal.imageRunState = serialized;
    } else {
      updatedInternal.videoRunState = serialized;
    }
    this.patchState({ _internal: updatedInternal });

    console.log(`[VideoGenAgent] ${stage} run completed:`, result.finalOutput);
  }

  private async handleSubmitAction(
    data: VideoGenMessageEvent.SubmitActionPayload,
  ): Promise<void> {
    const now = new Date().toISOString();
    const assets = this.state.assets.map((asset) => {
      if (!data.assetIds.includes(asset.id)) return asset;
      let decision: AssetDecision | undefined;
      switch (data.action) {
        case "approve_keyframe":
        case "continue_with_asset":
          decision = "approved";
          break;
        case "reject_keyframe":
          decision = "rejected";
          break;
        case "regenerate_keyframe":
          decision = "regenerate";
          break;
        default:
          decision = undefined;
      }
      if (!decision) return asset;
      return {
        ...asset,
        decision,
        updatedAt: now,
      };
    });
    this.patchState({ assets });

    switch (data.action) {
      case "approve_keyframe":
      case "continue_with_asset":
        await this.startVideoGeneration({ assetIds: data.assetIds });
        break;
      case "regenerate_keyframe":
        await this.startImageGeneration({ resume: false });
        break;
      case "approve_video":
        this.updateStatus("completed", "video_ready");
        this.setPendingAction(null);
        break;
      case "reject_video":
        this.updateStatus("failed", "video_rejected");
        break;
      case "retry_video_generation":
        await this.startVideoGeneration({
          assetIds:
            data.assetIds.length > 0
              ? data.assetIds
              : this.state._internal.selectedKeyframeIds,
          resume: Boolean(this.state._internal.videoRunState),
        });
        break;
      case "dismiss_action":
        this.setPendingAction(null);
        break;
      case "reject_keyframe":
        this.setPendingAction(null);
        break;
      default:
        break;
    }
  }

  private sendHistorySnapshot(connection: Connection, limit?: number): void {
    const assets =
      typeof limit === "number"
        ? this.state.assets.slice(-limit)
        : this.state.assets;
    VideoGenMessageEvent.sendEvent(
      connection as unknown as WebSocket,
      "history_snapshot",
      {
        assets,
      },
    );
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
      status: "idle",
      currentStep: "idle",
      lastUpdated: new Date().toISOString(),
      pendingAction: null,
      assets: [],
      input: {
        prompt: "empty_prompt",
        productImages: [],
        avatarImages: [],
      },
      _internal: {
        serializedRunState: undefined,
        runId: undefined,
        imageRunState: undefined,
        videoRunState: undefined,
        lastStage: undefined,
        selectedKeyframeIds: [],
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

    // const finalOutput = await this.runInternal(runtimeContext);
    // console.log({ finalOutput });

    console.log(`[VideoGenAgent] Returning response stream`);
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
    await this._onWsMessage(connection, message);
  }

  /**
   * internal handelrs for typesafe ws message events
   */
  async _onWsMessage(connection: Connection, message: WSMessage) {
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
          status: "collecting_input",
          currentStep: "input_ready",
          pendingAction: null,
          error: null,
        });
      },
      start_pipeline: async () => {
        await this.startImageGeneration();
      },
      start_image_gen: async (data) => {
        this.patchState({ input: data.input });
        await this.startImageGeneration();
      },
      start_video: async (data) => {
        const selectedUrl = data.selectedKeyframeUrl;
        const selectedAsset = selectedUrl
          ? this.state.assets.find(
              (asset) => asset.kind === "image" && asset.url === selectedUrl,
            )
          : undefined;

        if (data.motionPrompt) {
          this.patchState({
            input: {
              ...this.state.input,
              motionPrompt: data.motionPrompt,
            },
          });
        }

        await this.startVideoGeneration({
          assetIds: selectedAsset ? [selectedAsset.id] : undefined,
        });
      },
      submit_action: async (data) => {
        await this.handleSubmitAction(data);
      },
      cancel_run: async () => {
        this.resetState();
      },
      request_history: async (data) => {
        this.sendHistorySnapshot(connection, data.limit);
      },
      review_keyframe: async (data) => {
        const imageAssets = this.state.assets
          .filter((asset) => asset.kind === "image")
          .map((asset) => asset.id);
        if (!imageAssets.length) return;
        const actionMap: Record<
          typeof data.action,
          VideoGenMessageEvent.SubmitActionPayload["action"]
        > = {
          approve: "approve_keyframe",
          reject: "reject_keyframe",
          regenerate: "regenerate_keyframe",
        };
        await this.handleSubmitAction({
          action: actionMap[data.action],
          assetIds: imageAssets,
          feedback: data.feedback,
        });
      },
    });
  }

  /**
   * create initial run input items
   */
  private async createStageInput(
    stage: AgentStage,
    options?: StageOptions,
  ): Promise<AgentInputItem[]> {
    console.log(
      `[VideoGenAgent] Creating ${stage} input from state`,
      this.state,
    );

    const productImagePaths = await downloadImagesToTmp(
      this.state.input.productImages,
      "/tmp/products",
    );
    const avatarImagePaths = await downloadImagesToTmp(
      this.state.input.avatarImages,
      "/tmp/avatar",
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
        text: `Customer brief: ${this.state.input.prompt}`,
      },
    ];

    if (stage === "image_gen") {
      userContent.push({
        type: "input_text" as const,
        text: "STAGE DIRECTIVE: Generate 2-3 high quality keyframes focused on the product. Do not begin video generation yet. Provide diverse framing and lighting options while keeping the hero product clearly visible.",
      });
    } else {
      const selectedAssets = this.resolveKeyframeSelection(options?.assetIds);
      const keyframeUrls = selectedAssets
        .map((asset) => asset.url)
        .filter((url): url is string => Boolean(url));
      if (keyframeUrls.length) {
        userContent.push({
          type: "input_text" as const,
          text: `Approved keyframes to reference: ${keyframeUrls.join(", ")}`,
        });
        userContent.push(...toAgentImageInputs(keyframeUrls));
      }
      const motionPrompt = this.state.input.motionPrompt
        ? `User motion prompt: ${this.state.input.motionPrompt}`
        : "";
      userContent.push({
        type: "input_text" as const,
        text: `STAGE DIRECTIVE: Convert the approved keyframes into a smooth 6-8 second short-form video. Prioritize continuity, natural camera motion, and product clarity. ${motionPrompt}`,
      });
    }

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
