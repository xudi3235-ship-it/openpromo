/**
 * Shared utilities for evaluation tools.
 * Ported from Python: src/openai_agent/tools/evaluation.py
 */

import { readFileSync } from "node:fs";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";

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
 */
export function toImageInputs(imagePaths: string[]): ResponseInputImage[] {
  return imagePaths.map((path) => ({
    type: "input_image" as const,
    image_url: encodeImageToBase64(path),
    detail: "auto",
  }));
}
