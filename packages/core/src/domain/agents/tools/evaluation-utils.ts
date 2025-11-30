/**
 * Shared utilities for evaluation tools.
 * Ported from Python: src/openai_agent/tools/evaluation.py
 */

import { readFileSync } from "node:fs";
import { isStringUrl } from "@core/utils/common";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";

/**
 * Input image type for OpenAI Agents SDK (different from Responses API)
 */
export type AgentInputImage = {
  type: "input_image";
  image: string; // base64 data URL or regular URL
  detail?: string;
};

/**
 * Encode an image file to base64 data URL.
 */
export function encodeImageToBase64(imagePath: string): string {
  const imageBuffer = readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  // Detect mime type from extension
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "jpeg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert image paths to OpenAI Responses API image input format.
 * if url, use them as is; if local path, encode to base64 data URL.
 */
export function toImageInputs(maybePathOrUrls: string[]): ResponseInputImage[] {
  return maybePathOrUrls.map((obj) => {
    if (isStringUrl(obj)) {
      return { image_url: obj, type: "input_image" as const, detail: "auto" };
    }

    return {
      image_url: encodeImageToBase64(obj),
      type: "input_image" as const,
      detail: "auto",
    };
  });
}

/**
 * Convert image paths to OpenAI Agents SDK image input format.
 * Uses `image` field instead of `image_url`.
 */
export function toAgentImageInputs(
  maybePathOrUrls: string[],
): AgentInputImage[] {
  return maybePathOrUrls.map((input) => {
    if (isStringUrl(input)) {
      return { type: "input_image" as const, image: input, detail: "auto" };
    }

    return {
      type: "input_image" as const,
      image: encodeImageToBase64(input),
      detail: "auto",
    };
  });
}
