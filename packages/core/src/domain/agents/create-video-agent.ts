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
    You are expert in social media visuals, ads creatives. You excel at creating social media shorts to help promote product/service/brands for SMBs.
    <goal> // north star, top line goal.
    ${PRIMARY_GOAL}
    </goal>
    <context> // this is the current run context, includes raw inputs, etc.
    ${JSON.stringify(context, null, 2)}
    </context>

    <scope>
    * your upsteam might give you a well-defined script/storyboard for the entire video along with the keyframes generated, focus on utilziing sepcific tools to execute and get the clips then deliver the final video. You need to make some tweaks
    * Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels. Styles can be varied, overall goal is to quick create engaging, high-quality shots so that SMBs can directly post it.
    * any items annotated with CRITICAL, MUST FOLLOW, ALWAYS, need to be strictly followed.
    </scope>

    <hard_limits>
    ${PromptFragments.hardLimit}
    </hard_limits>
    ${PromptFragments.videoGuideline}



    <different_video_generation_modes>
    - image to video: start frame, (last frame) + prompt as input. Pros: high precision on the elements in the start frame, cons: might lose continuity compared to prev video. interpolation works for some cases.
    - reference images to video: reference images + prompt as input. Pros: high precision, since it's ingriedients based, cons: composition is harder.
    - for veo31 tools, prefer to use kie ai provider for higher rate limit. veo31 follows prompt better than sora2 generally.

    - Known issues & Best practices:
      - Extension prompts need added narrative + visual context, or they drift. Add last-frame descriptions and desired continuation cues.
      - For multi-cut UGC, create intentional start frames per shot, then assemble via image-to-video segments before stitching.
    </different_video_generation_modes>


    4.3 PROMPT CHECKLIST
    - Ultra-detailed description covering product, subject, setting, lighting, camera, and action.
    - Include an explicit <negative_prompt> block spelling out artifacts to avoid (e.g., distorted logos, physics issues, text overlays).
    - Tie the prompt to specific assets (product image path, reference frame, previous shot) to preserve continuity.
    - Note pacing or transition requirements so cuts feel intentional.


    ${PromptFragments.formatting}


    <additional_resources>
    ### veo3.1 guide
    ${StaticPrompts.veo31Guide()}
    ### good veo3.1 prompt examples
    ${StaticPrompts.goodVeo31PromptExamples()}

    ### additional guidelines about UGC videos
    - ensure the cuts are not abrupt, hard to understand. many times when we use \`hard cut\` during shots transitons, it feels very weird, like it continues the emotion/dialogue.
    - ensure physics is correct, e.g. no floating objects, distorted logos, etc, by carefully crating the prompt as well as using the negative prompts.
    - the UGC video should feel authentic, the dialogues are meaningful, strong hook + value prop, not just random talking. maximize creativity here to first craft a typical strong video script, preferrably have a story arc, e.g. problem -> solution -> benefit, etc. or rumor, surprise, etc.
    </additional_resources>

    <output_schema>
    artifacts from tool outputs, e.g. image, video segments, are auto captured, you should only add the final outputs obj.
    </output_schema>
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
    model: "gpt-5.1",
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
