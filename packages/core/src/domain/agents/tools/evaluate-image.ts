/**
 * Image evaluation tool for video generation agent.
 * Ported from Python: src/openai_agent/tools/evaluation.py
 */

import { oai } from "@core/providers/openai";
import { tool } from "@openai/agents";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { PRIMARY_GOAL } from "../constants";
import { toImageInputs } from "./evaluation-utils";

// Output schema for image evaluation
const ImageEvalOutputSchema = z.object({
  approved: z.boolean().describe("Whether the images/prompts are approved"),
  feedback: z
    .string()
    .describe(
      "if not approved, Constructive feedback on improvements, single sentence, concise effective",
    )
    .optional(),
});

// Parameter schema for evaluate image tool
const EvaluateImageParamsSchema = z.object({
  imagePaths: z
    .array(z.string())
    .describe("List of file paths to the images to evaluate"),
});

type EvaluateImageParams = z.infer<typeof EvaluateImageParamsSchema>;

/**
 * Evaluate generated images tool.
 * Ensures images meet quality and relevance criteria before video generation.
 */
export const evaluateImageTool = tool({
  name: "evaluate_image",
  description:
    "Evaluate generated images to ensure they meet quality and relevance criteria for video generation. Use this after generating images to validate quality.",
  parameters: EvaluateImageParamsSchema,
  async execute(params: EvaluateImageParams) {
    const { imagePaths } = params;

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
          format: zodTextFormat(ImageEvalOutputSchema, "image_eval"),
        },
      });

      const result = response.output_parsed;
      if (!result) throw new Error("Failed to parse response");
      console.log(`[evaluateImage] Result:`, result);
      return result;
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
