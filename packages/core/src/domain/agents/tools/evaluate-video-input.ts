/**
 * Video input evaluation tool for video generation agent.
 * Ported from Python: src/openai_agent/tools/evaluation.py
 */

import { oai } from "@core/providers/openai";
import { type RunContext, tool } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { PRIMARY_GOAL } from "../constants";
import type { VideoGenAgentContext } from "../context";
import { StaticPrompts } from "../prompts";
import { toImageInputs } from "./evaluation-utils";

// Output schema for video input evaluation
const VideoInputEvalOutputSchema = z.object({
  approved: z.boolean().describe("Whether the video inputs are approved"),
  feedback: z
    .string()
    .describe(
      "if not approved, Constructive feedback on improvements, single sentence, concise effective",
    )
    .optional(),
});

// Parameter schema for evaluate video input tool
const EvaluateVideoInputParamsSchema = z.object({
  imagePaths: z.array(z.string()).describe("veo3.1 image inputs, if any"),
  prompt: z.string().describe("The veo3.1 prompt to evaluate"),
});

type EvaluateVideoInputParams = z.infer<typeof EvaluateVideoInputParamsSchema>;

/**
 * Evaluate video generation inputs (images + prompt) tool.
 * Validates inputs before calling veo3.1.
 * Not in use for now.
 */
export const evaluateVideoInputTool = tool({
  name: "evaluate_video_input",
  description:
    "Evaluate inputs for veo3.1 video generation, including images and prompt. Use this to validate quality before generating video.",
  parameters: EvaluateVideoInputParamsSchema,
  async execute(
    params: EvaluateVideoInputParams,
    _runContext?: RunContext<VideoGenAgentContext>,
  ) {
    const { imagePaths, prompt } = params;

    try {
      console.log(
        `[evaluateVideoInput] Evaluating prompt: ${prompt}, images: ${imagePaths.join(", ")}`,
      );

      const response = await oai().responses.parse({
        model: "gpt-5-mini",
        instructions: `
ROLE & GOAL
You are expert in evaluating inputs for veo3.1 video generation for SMBs, including image and video prompts.

Given the primary goal of the agent who produced these imgs: ${PRIMARY_GOAL}
and the primary target is SMBS(small businesses) who need quick, high-quality, engaging social media shorts/ads/videos for their products on social media(tiktok, ig reels, fb reels, etc).

SCOPE
* Focus on: the camera movements, the shot, storyboard, if they make sense, and what can be improved, also dialogue, audio, etc, pretty much everything, to ensure the quality!
* Evaluate how well the images align with the product, reference images, and overall goal.
* if good enough, then approve with a single sentence, else Provide constructive feedback *ONLY what could be improved to better meet the primary in concise 2-3 sentence actionable terms.

REFERENCES
### veo3.1 guide
${StaticPrompts.veo31Guide()}
### GOOD veo3.1 prompt examples
${StaticPrompts.goodVeo31PromptExamples()}
`,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Here is the veo3.1 prompt to evaluate:\n${prompt}\n\nAnd here are the image inputs:`,
              },
              ...toImageInputs(imagePaths),
            ],
          },
        ],
        text: {
          format: zodTextFormat(VideoInputEvalOutputSchema, "video_input_eval"),
        },
      });

      const result = response.output_parsed;
      if (!result) throw new Error("Failed to parse response");
      console.log(`[evaluateVideoInput] Result:`, result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[evaluateVideoInput] Error:`, errorMessage);
      return {
        approved: false,
        feedback: `Error evaluating video inputs: ${errorMessage}`,
      };
    }
  },
});
