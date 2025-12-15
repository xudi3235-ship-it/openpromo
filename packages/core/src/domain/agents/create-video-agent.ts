import { Agent } from "@openai/agents";
import z from "zod";
import { PRIMARY_GOAL } from "./constants";
import type { VideoGenAgentContext } from "./context";
import { PromptFragments } from "./prompt-fragments";
import { StaticPrompts } from "./prompts";
import { ffmpegTool, veo31ImageToVideoTool, virtualShellTool } from "./tools";
import { sora2ProI2VTool } from "./tools/sora2-pro-i2v";
import { videoToSpecTool } from "./tools/video-to-spec";

/**
 * Build the system prompt for video generation agent.
 * Ported from Python main_agent.py create_main_agent()
 */
export function buildSystemPrompt(context?: VideoGenAgentContext): string {
  return `
    You are expert in social media visuals, ads creatives. You excel at creating social media shorts to help promote product/service/brands for SMBs. You are part of a larger system, your goal is to use the keyframes including the product and high level task context to focus on video production.
    <goal> // north star, top line goal.
    ${PRIMARY_GOAL}
    </goal>
    <context> // this is the current run context, includes raw inputs, etc.
    ${JSON.stringify(context, null, 2)}
    </context>

    <scope>
    * your upsteam might give you a well-defined script/storyboard for the entire video along with the keyframes generated, focus on utilziing sepcific tools to execute and get the clips then deliver the final video. 
    * CRIICAL: You need to finetune the upstream blueprint/high level script into ultra-detailed, precise prompt for veo3.1 to generate. do not use them as-is. deeply finetune, enhance it based on multiple factors including: product nature, brand, reference's inspiration.
    * Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels. Styles can be varied, overall goal is to quick create engaging, high-quality shots so that SMBs can directly post it.
    * any items annotated with CRITICAL, MUST FOLLOW, ALWAYS, need to be strictly followed.
    </scope>

    <hard_limits>
    ${PromptFragments.hardLimit}
    </hard_limits>
    ${PromptFragments.differntVideoTools}

    <different_video_generation_modes>
    - image to video: start frame, (last frame) + prompt as input. Pros: high precision on the elements in the start frame, cons: might lose continuity compared to prev video. interpolation works for some cases.
    - reference images to video: reference images + prompt as input. Pros: high precision, since it's ingriedients based, cons: composition is harder.
    - for veo31 tools, prefer to use kie ai provider for higher rate limit. veo31 follows prompt better than sora2 generally.

    - Known issues & Best practices:
      - Extension prompts need added narrative + visual context, or they drift. Add last-frame descriptions and desired continuation cues.
      - For multi-cut UGC, create intentional start frames per shot, then assemble via image-to-video segments before stitching.
    </different_video_generation_modes>

    ${PromptFragments.formatting}

    <additional_resources>
    ### veo3.1 guide
    ${StaticPrompts.veo31Guide()}
    ### good veo3.1 prompt examples
    ${StaticPrompts.goodVeo31PromptExamples()}
    </additional_resources>
    `;
}

export const videoAgentOutput = z.object({
  status: z.enum(["success", "failure"]).describe("status of the task"),
  finalVideo: z.object({
    url: z.string(),
    path: z.string(),
    description: z.string(),
  }),
  summary: z.string().describe("summary of the video generation task"),
});

/**
 * Create the video generation sub-agent with typed context.
 * This agent handles actual video creation using veo3.1, sora2, ffmpeg tools.
 */
export function createVideoGenAgent() {
  const agent = new Agent<VideoGenAgentContext, typeof videoAgentOutput>({
    name: "VideoGenAgent",
    model: "gpt-5.2",
    instructions: (runCtx, _agent) => {
      return buildSystemPrompt(runCtx.context).replaceAll("  ", "");
    },
    handoffs: [],
    tools: [
      virtualShellTool,
      videoToSpecTool,
      veo31ImageToVideoTool,
      sora2ProI2VTool,
      ffmpegTool,
    ],
    modelSettings: {
      reasoning: {
        effort: "low",
        summary: "auto",
      },
    },
    outputType: videoAgentOutput,
  });
  return agent;
}
