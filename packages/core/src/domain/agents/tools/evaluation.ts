/**
 * Image evaluation tool for video generation agent.
 * Ported from Python: src/openai_agent/tools/evaluation.py
 */

import { readFileSync } from "node:fs";
import { oai } from "@core/providers/openai";
import { type RunContext, tool } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";
import { z } from "zod";
import { PRIMARY_GOAL } from "../constants";
import type { VideoGenRunContext } from "../context";
import { StaticPrompts } from "../prompts";

/**
 * Encode an image file to base64 data URL.
 */
function encodeImageToBase64(imagePath: string): string {
  const imageBuffer = readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  // Detect mime type from extension
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "jpeg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert image paths to OpenAI Responses API image input format.
 */
function toImageInputs(imagePaths: string[]): ResponseInputImage[] {
  return imagePaths.map((path) => ({
    type: "input_image" as const,
    image_url: encodeImageToBase64(path),
    detail: "auto",
  }));
}

const ImageEvalOutput = z.object({
  approved: z.boolean().describe("Whether the images/prompts are approved"),
  feedback: z
    .string()
    .describe(
      "if not approved, Constructive feedback on improvements, single sentence, concise effective",
    )
    .optional(),
});

/**
 * Evaluate generated images tool.
 * Ensures images meet quality and relevance criteria before video generation.
 */
export const evaluateImageTool = tool({
  name: "evaluate_image",
  description:
    "Evaluate generated images to ensure they meet quality and relevance criteria for video generation. Use this after generating images to validate quality.",
  parameters: z.object({
    imagePaths: z
      .array(z.string())
      .describe("List of file paths to the images to evaluate"),
  }),
  async execute({ imagePaths }) {
    try {
      const response = await oai().responses.parse({
        model: "gpt-5-mini",
        instructions: `
ROLE & GOAL
You are expert in evaluating images generated from product + reference images, that will be later used for video generation flow.
Given the primary goal of the agent who produced these imgs: ${PRIMARY_GOAL}
and the primary target is SMBS(small businesses) who need quick, high-quality, engaging social media shorts/ads/videos for their products on social media(tiktok, ig reels, fb reels, etc).

SCOPE
* Focus on: analyzing the generated images, understanding product, selling points, and target audience.
* Evaluate how well the images align with the product, reference images, and overall goal.
* consider aspects like visual appeal, clarity of product representation, creativity, and suitability for social media platforms.
* consider aspects like distortion of body, unwanted multiple weird fingers, etc.
* if good enough, then approve with a single sentence, else Provide constructive feedback *ONLY what could be improved to better meet the primary in concise 2-sentence actionable terms.
`,
        input: [
          {
            role: "user",
            content: [...toImageInputs(imagePaths)],
          },
        ],
        text: {
          format: zodTextFormat(ImageEvalOutput, "image_eval"),
        },
      });

      const result = response.output_parsed;
      console.log(`[evaluateImage] Result:`, result);
      return (
        result ?? { approved: false, feedback: "Failed to parse response" }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[evaluateImage] Error:`, errorMessage);
      return {
        approved: false,
        feedback: `Error evaluating images: ${errorMessage}`,
      };
    }
  },
});

const VideoInputEvalOutput = z.object({
  approved: z.boolean().describe("Whether the video inputs are approved"),
  feedback: z
    .string()
    .describe(
      "if not approved, Constructive feedback on improvements, single sentence, concise effective",
    )
    .optional(),
});

/**
 * Evaluate video generation inputs (images + prompt) tool.
 * Validates inputs before calling veo3.1.
 * Not in use for now.
 */
export const evaluateVideoInputTool = tool({
  name: "evaluate_video_input",
  description:
    "Evaluate inputs for veo3.1 video generation, including images and prompt. Use this to validate quality before generating video.",
  parameters: z.object({
    imagePaths: z.array(z.string()).describe("veo3.1 image inputs, if any"),
    prompt: z.string().describe("The veo3.1 prompt to evaluate"),
  }),
  async execute(
    { imagePaths, prompt },
    _runContext?: RunContext<VideoGenRunContext>,
  ) {
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
          format: zodTextFormat(VideoInputEvalOutput, "video_input_eval"),
        },
      });

      const result = response.output_parsed;
      console.log(`[evaluateVideoInput] Result:`, result);
      return (
        result ?? { approved: false, feedback: "Failed to parse response" }
      );
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
