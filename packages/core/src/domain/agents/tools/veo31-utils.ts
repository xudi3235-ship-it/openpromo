/**
 * Shared utilities for VEO 3.1 video generation tools.
 * Ported from Python: src/openai_agent/tools/veo31.py
 *
 * NOTE: OpenAI Agents SDK requires `.nullable()` with `.optional()` for Zod schemas.
 * Using `.optional()` alone will cause: "Zod field uses .optional() without .nullable()
 * which is not supported by the API". Always use `.nullable().optional()` for optional fields.
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { KieAIClient } from "@core/providers/kie-ai";
import { downloadVideo as downloadVideoBase } from "@core/utils/common";
import { env } from "@core/utils/env";
import { z } from "zod";

/**
 * Get KieAI client instance.
 */
export function getKieAIClient(): KieAIClient {
  return new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
}

/**
 * Upload a local file to KieAI and return the download URL.
 * Ported from Python: upload_images_to_kie_ai in provider_kie_ai.py
 */
export async function uploadFile(
  client: KieAIClient,
  filePath: string,
): Promise<string> {
  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);

  console.log(`[veo31] Uploading file: ${filePath}`);

  const response = await client.uploadFileStream({
    file: fileBuffer,
    uploadPath: "veo31/images",
    fileName,
  });

  if (!response.data?.downloadUrl) {
    throw new Error(`Failed to upload file: ${filePath}`);
  }

  console.log(`[veo31] Uploaded: ${filePath} -> ${response.data.downloadUrl}`);
  return response.data.downloadUrl;
}

/**
 * Upload multiple files and return their URLs.
 */
export async function uploadFiles(
  client: KieAIClient,
  filePaths: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const filePath of filePaths) {
    const url = await uploadFile(client, filePath);
    urls.push(url);
  }
  return urls;
}

/**
 * Download video from URL and save to local path.
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
): Promise<void> {
  await downloadVideoBase(url, outputPath, "veo31");
}

/**
 * Common config schema for veo31 tools.
 */
export const Veo31ConfigSchema = z.object({
  resolution: z
    .enum(["720p", "1080p"])
    .default("720p")
    .describe(
      "Resolution of the generated video. 1080p only works with 8s duration.",
    ),
  durationSeconds: z
    .enum(["4", "6", "8"])
    .default("8")
    .describe("Duration of the generated video in seconds."),
  aspectRatio: z
    .enum(["9:16", "16:9"])
    .default("9:16")
    .describe("Aspect ratio. Use 9:16 for TikTok/Reels, 16:9 for YouTube."),
});

export type Veo31Config = z.infer<typeof Veo31ConfigSchema>;

/**
 * Default config for veo31 tools.
 */
export const defaultVeo31Config: Veo31Config = {
  resolution: "720p",
  durationSeconds: "8",
  aspectRatio: "9:16",
};
