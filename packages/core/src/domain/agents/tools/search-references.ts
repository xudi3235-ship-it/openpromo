/**
 * Unified tool for searching reference library (images and videos).
 * Used by orchestrator and image-gen agents to find proven ad formats/blueprints.
 */

import { ReferenceSearch } from "@core/domain/reference/reference-search";
import {
  type ToolOutputImage,
  type ToolOutputText,
  tool,
} from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { downloadImagesToTmp } from "../utils";

const toolParams = z.object({
  query: z
    .string()
    .describe(
      "Search query based on product type, style, industry, or desired format (e.g., 'UGC testimonial beauty product', 'fast-paced product demo tech')",
    ),
  type: z
    .enum(["image", "video"])
    .describe("Filter by reference type: 'image', or 'video'"),
  limit: z.number().default(5).describe("Maximum number of results to return"),
});

export const searchReferencesTool = tool<
  VideoGenAgentContext,
  VideoGenAgentContext
>({
  name: "search_references",
  description: `Search the reference library for proven ad formats, blueprints, and style references.
Returns both images (for style/keyframe inspiration) and videos (with shot-by-shot blueprints).
Use the 'type' filter if you need specifically images or videos.
The results are based on vector similarity search based on keywords, tags, etc.
`,
  parameters: toolParams,
  execute: async ({ query, type, limit }) => {
    // Search all references
    const results = await ReferenceSearch.findSimilar(query, {
      topK: limit * 2, // Get extra to filter
      namespace: type, // Filter by type
    });

    // Enrich with full data and presigned URLs
    const enrichedResults = await Promise.all(
      results.slice(0, limit).map(async (r) => {
        if (r.type === "video") {
          const video = await ReferenceSearch.getVideoReference(r.id);
          if (!video) return null;

          return {
            id: r.id,
            type: "video" as const,
            score: r.score,
            description: video.description,
            keywords: video.keywords,
            industries: video.industries,
            duration: video.duration,
            aspectRatio: video.aspectRatio,
            audio: video.audio,
            blueprint: video.blueprint,
            sourceUrl: await ReferenceSearch.getPresignedUrl(
              `videos/${r.id}/source.mp4`,
            ),
            audioUrl: video.audio.isReusable
              ? await ReferenceSearch.getPresignedUrl(
                  `videos/${r.id}/audio.mp3`,
                )
              : null,
          };
        } else {
          const image = await ReferenceSearch.getImageReference(r.id);
          if (!image) return null;

          return {
            id: r.id,
            type: "image" as const,
            score: r.score,
            description: image.description,
            keywords: image.keywords,
            industries: image.industries,
            sourceUrl: await ReferenceSearch.getPresignedUrl(r.id, "image"),
          };
        }
      }),
    );

    // Filter out nulls (failed lookups)
    const validResults = enrichedResults.filter((r) => r !== null);
    // download refernce images
    const localImgPaths = await downloadImagesToTmp(
      validResults.map((r) => r.sourceUrl),
      "/tmp/reference",
    );

    const txtPart: ToolOutputText = {
      type: "text",
      text: `Found ${validResults.length} matching reference(s) for query "${query}". NOTE: images are returned to you. videos are not supported yet.
       Full response: ${JSON.stringify(validResults, null, 2)}
       the reference images are downloaded to local paths: ${JSON.stringify(localImgPaths, null, 2)}
       `,
    };
    const imgParts: ToolOutputImage[] = validResults
      .filter((r) => r && r.type === "image")
      .map((r) => ({
        type: "image",
        image: r.sourceUrl,
        detail: "low",
      }));

    return [txtPart, ...imgParts];
  },
});
