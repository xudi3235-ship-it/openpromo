import { openai } from "@ai-sdk/openai";
import type { ApiEnv } from "@core/helpers/api-env";

// import { routeAgentRequest } from "agents";

import { Agent, type AgentInputItem, run } from "@openai/agents";
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
import { PRIMARY_GOAL, VIDEO_TYPES_REGISTRY } from "./constants";
import type { VideoGenRunContext } from "./context";
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
import {
  type AgentInputImage,
  toAgentImageInputs,
} from "./tools/evaluation-utils";
import { buildTreeString, downloadImagesToTmp } from "./utils";

/**
 * Build the system prompt for video generation agent.
 * Ported from Python main_agent.py create_main_agent()
 */
function buildSystemPrompt(context?: VideoGenRunContext): string {
  const contextSection = context
    ? `
    ## CURRENT CONTEXT
    - Product: ${context.product}
    - Business: ${context.business}
    ${context.avatarReferenceImageUrl ? `- Avatar Reference Image: ${context.avatarReferenceImageUrl}` : ""}
    `
    : "";

  return `
    You are expert in social media visuals, ads creatives.
    ${contextSection}
    1. PRIMARY GOAL
    ${PRIMARY_GOAL}
    2. SCOPE
    * Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels. Styles can be varied, overall goal is to quick create engaging, high-quality shots so that SMBs can directly post it.
    * shell tool runs in /tmp directory by default. Product image inputs are in the ./products folder (relative to cwd). Use relative paths from /tmp.
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
function createVideoGenAgent(context: VideoGenRunContext) {
  const agent = new Agent<VideoGenRunContext>({
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
  VideoGenMessageEvent.VideoGenState
> {
  constructor(ctx: AgentContext, env: ApiEnv) {
    super(ctx, env);
    // state is persisted automatically using setState
  }
  /**
   * triggered when app state is updated
   */
  async onStateUpdate(
    state: VideoGenMessageEvent.VideoGenState | undefined,
    source: Connection | "server",
  ): Promise<void> {
    console.log(`[VideoGenAgent] onStateUpdate called from`, source, state);
    this.broadcastState();
  }

  private broadcastState() {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      VideoGenMessageEvent.sendEvent(conn, "sync_state", {
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
    const runtimeContext: VideoGenRunContext = {
      product: "Example Product",
      business: "Example Business",
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
        console.log(`[VideoGenAgent] Received echo message:`, data, connection);
        VideoGenMessageEvent.sendEvent(connection, "echo", {
          message: `Echo: ${data.message}`,
        });
      },
    });
  }

  /**
   * Run video generation agent using OpenAI Agents SDK.
   * This is the internal implementation that uses typed context.
   *
   * @param prompt - The user prompt/request for video generation
   * @param context - Runtime context with product and business info
   * @returns Run result with final output
   */

  async runInternal(context: VideoGenRunContext) {
    const agent = createVideoGenAgent(context);
    // print cwd
    console.log(`[VideoGenAgent] Current working directory: ${process.cwd()}`);

    // Image URLs to download
    const productImageUrls = [
      "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
    ];
    const avatarImageUrls = [
      "https://i.pinimg.com/1200x/04/9a/65/049a6564d158084703960383df8de897.jpg",
    ];

    // Download images to /tmp
    console.log(`[VideoGenAgent] Downloading images to /tmp...`);
    const productImagePaths = await downloadImagesToTmp(
      productImageUrls,
      "/tmp/products",
    );
    const avatarImagePaths = await downloadImagesToTmp(
      avatarImageUrls,
      "/tmp/avatar",
    );
    console.log(`[VideoGenAgent] Product images:`, productImagePaths);
    console.log(`[VideoGenAgent] Avatar images:`, avatarImagePaths);

    // Show tmp structure
    console.log(`[VideoGenAgent] /tmp structure:\n${VideoGenAgent.tmpDirStr}`);

    const inputItems = this.createRunInput(productImagePaths, avatarImagePaths);

    // Setup lifecycle hooks for logging
    setupAgentHooks(agent, { verbose: true });

    const result = await run(agent, inputItems, {
      context,
    });

    console.log(`[VideoGenAgent] Run completed:`, result.finalOutput);
    return result;
  }

  private createRunInput(
    productImagePaths: string[],
    avatarImagePaths: string[],
  ): AgentInputItem[] {
    // Convert paths to image inputs using Agents SDK format
    const productImages = toAgentImageInputs(productImagePaths);
    const avatarImages = toAgentImageInputs(avatarImagePaths);

    // Log image inputs (truncate base64 for readability)
    const truncateBase64 = (img: AgentInputImage) => ({
      ...img,
      image: img.image?.startsWith("data:")
        ? `${img.image.slice(0, 50)}...[truncated]`
        : img.image,
    });
    console.log(
      `[VideoGenAgent] Product image inputs:`,
      JSON.stringify(productImages.map(truncateBase64), null, 2),
    );
    console.log(
      `[VideoGenAgent] Avatar image inputs:`,
      JSON.stringify(avatarImages.map(truncateBase64), null, 2),
    );

    // Build user message content using Agents SDK types
    // UserMessageItem expects content with input_text and input_image types
    const userContent = [
      // 1. product images
      {
        type: "input_text" as const,
        text: "here are the product images that we're focusing on:",
      },
      ...productImages,
      // 2. avatar reference images
      {
        type: "input_text" as const,
        text: "here is the avatar i'd like to use",
      },
      ...avatarImages,
      // 3. tmp dir structure
      {
        type: "input_text" as const,
        text: `here is the current, latest tmp dir structure. no need to run shell tool to inspect it for now.\n${VideoGenAgent.tmpDirStr}. Your cwd is /tmp`,
      },
      // 4. customer prompt
      {
        type: "input_text" as const,
        text: `customer request: create a 8s tiktok style ugc video for the product, focusing on its key features and benefits. use the avatar image provided as the main character in the video.`,
      },
    ];

    console.log(
      `[VideoGenAgent] User content length: ${userContent.length} items`,
    );

    // Build the user message item using Agents SDK format
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
