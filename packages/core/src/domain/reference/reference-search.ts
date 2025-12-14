import { openai } from "@ai-sdk/openai";
import { Binding } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import { Log } from "@core/utils/log";
import { generateObject, type ImagePart } from "ai";
import { ulid } from "ulid";
import { z } from "zod";
import { EntProduct } from "../product";
import { analyzeReferenceVideo } from "./video-analyzer";

const REFERENCE_BUCKET = "openpromo-reference";

const log = Log.create({ namespace: "reference-search" });

/**
 * Schema for AI-generated reference image tags.
 * Minimal and flexible - keywords are freeform, industries for product matching.
 */
const ReferenceTagSchema = z.object({
  description: z
    .string()
    .describe("1-2 sentence visual summary of the image content and style"),
  keywords: z
    .array(z.string())
    .describe(
      "5-15 freeform tags: visual style (UGC, studio, lifestyle, product-shot), mood (energetic, calm, luxurious), subjects, colors, composition , etc. pick the most relevant keywords/tags for searching and relevancy",
    ),
  industries: z
    .array(z.string())
    .describe(
      "relevant industries: beauty, fitness, tech, fashion, food, home, travel, automotive, health, pets, kids, sports, entertainment. be specific and search friendly",
    ),
});

type ReferenceTag = z.infer<typeof ReferenceTagSchema>;

/**
 * Search result from Vectorize (images)
 */
export interface ReferenceSearchResult {
  id: string;
  score: number;
  type: "image" | "video";
  description: string;
  keywords: string[];
  industries: string[];
  createdAt: string;
}

/**
 * Image reference with source extension
 */
export interface ImageReferenceResult extends ReferenceSearchResult {
  type: "image";
  sourceExt: string;
}

/**
 * Video reference with full blueprint
 */
export interface VideoReferenceResult extends ReferenceSearchResult {
  type: "video";
  blueprint: string;
  duration: number;
  aspectRatio: string;
  audio: {
    type: string;
    mood: string;
    isReusable: boolean;
    reasoning: string;
  };
}

/**
 * Search options for reference images
 */
export interface ReferenceSearchOptions {
  /** Maximum number of results to return */
  topK?: number;
  /** Filter by industries (match any) */
  industries?: string[];
  /** Return vector values (for debugging) */
  returnValues?: boolean;
  // namespace to filter
  namespace?: string;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Embed text using BGE model (Workers AI)
 */
async function embedText(text: string): Promise<number[]> {
  const env = Binding.use();

  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  });

  if (!("data" in result) || !result.data) {
    throw new Error("Failed to generate embedding - no data returned");
  }

  return result.data[0];
}

/**
 * Convert Vectorize match to search result
 */
function toSearchResult(match: VectorizeMatch): ReferenceSearchResult {
  const metadata = match.metadata || {};
  return {
    id: match.id,
    score: match.score,
    type: (metadata.type as "image" | "video") || "image",
    description: (metadata.description as string) || "",
    keywords: (metadata.keywords as string[]) || [],
    industries: (metadata.industries as string[]) || [],
    createdAt: (metadata.createdAt as string) || "",
  };
}

/**
 * Get image from R2 as data URL for vision model
 */
async function getImageUrl(key: string): Promise<string> {
  const env = Binding.use();

  const object = await env.ReferenceBucket.get(key);
  if (!object) {
    throw new Error(`Reference image not found: ${key}`);
  }

  const bytes = await object.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(bytes).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );

  const ext = key.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mimeType = mimeTypes[ext || ""] || "image/jpeg";

  return `data:${mimeType};base64,${base64}`;
}

const analyzeTaskSegment = `Analyze the provided image and extract:
1. A concise description (1-2 sentences) focusing on visual style, composition, and subjects
2. Keywords covering: visual style, mood/tone, subjects/objects, color palette, composition type, any notable elements and successful features
3. Relevant industries this image would be useful for as ad creative reference

Be specific and practical - these tags will be used to search and match images to product categories.`;

/**
 * Analyze image to get structured tags
 */
async function analyzeImage(imageUrl: string): Promise<ReferenceTag> {
  const imgPart: ImagePart = {
    type: "image",
    image: imageUrl,
  };

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    schema: ReferenceTagSchema,
    maxOutputTokens: 2000,
    messages: [
      {
        role: "system",
        content: `
<Role>
You are an expert at analyzing images for an ad creative reference library. You will analyze images or keyframes from viral top performing ads/social media contents and extract concice descriptions, tag,s any relevant elements from it that would help categorize and search for similar images.

This is critical as the accuracy matters the most for survival of small businesses.
</Role>

<Task>
${analyzeTaskSegment}
</Task>

<Rules>
1. critical to be accurate and concise when tagging, as these tags will determine search relevancy
2. use a progressive pattern: for industry, start broad 1-2, then more specific 3-5; similarly for keywords, take the progressive tagging approach.
3. reason about what the images, as reference, are really good for certain product types, industry, use cases, vibes, etc. the more specific the keywords are, the better for search.
</Rules>
`,
      },
      {
        role: "user",
        content: [imgPart],
      },
    ],
  });

  return result.object;
}

const searchSchema = z.object({
  query: z.string().min(1).describe("Natural language search query"),
});

// TODO: load product context
async function genSearchQueryFromProductImages(
  imgs: string[],
): Promise<z.infer<typeof searchSchema>> {
  const imgParts: ImagePart[] = imgs.map((url) => ({
    type: "image",
    image: url,
  }));

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    schema: searchSchema,
    maxOutputTokens: 200,
    messages: [
      {
        role: "system",
        content: `
<Role>
You are an expert at analyzing product images, and create search keywords from our ad creative reference library. You will analyze images of the products, and create a concise search query that will help find relevant ad creative/visuals fitting for promoting this product in the next workflows(e.g. generating ad creatives, videos, etc). The reference lib is maintained by us with thousands of editorial, ugc, lifestyle, product-shot that are top of the qualtiy in the market out ther, and downstream our systems will use the matchiing refences combined with product iamges to create ready-to-go ad creatives for small businesses.

This is critical as the accuracy matters the most for survival of small businesses.
</Role>

<Context>
here is the previous prompt we instructed to tag & process the reference images in ingestion flow:
${analyzeTaskSegment}

metadata schema used: ${z.toJSONSchema(ReferenceTagSchema)}
</Context>

<Task>
1. analyze the product imgs and context, create a concise 3-5 keyword search query that can mest match refences that fits with the product.
</Task>

<Rules>
1. critical to be accurate and concise, as these tags will determine search relevancy
</Rules>
`,
      },
      {
        role: "user",
        content: imgParts,
      },
    ],
  });

  return result.object;
}

// ============================================================================
// Exported namespace
// ============================================================================

export namespace ReferenceSearch {
  /**
   * Check if a reference already exists in the index
   */
  export async function exists(id: string): Promise<boolean> {
    const env = Binding.use();
    const results = await env.ReferenceIndex.getByIds([id]);
    return results && results.length > 0;
  }

  /**
   * Process a reference video: analyze with Gemini, create folder structure, embed, and index.
   * Creates: videos/{id}/source.mp4, spec.txt, metadata.json
   */
  export async function processVideo(key: string): Promise<void> {
    const env = Binding.use();

    // Generate video ID
    const videoId = ulid();
    const videoFolder = `videos/${videoId}`;

    // Check if already processed (by original key)
    if (await exists(key)) {
      log.info("video already indexed by original key, skipping", { key });
      return;
    }

    log.info("processing reference video", { key, videoId });

    // Analyze video with Gemini
    const analysis = await analyzeReferenceVideo(key);

    // Move source video to folder structure (R2 has no native move, so copy+delete)
    const sourceObject = await env.ReferenceBucket.get(key);
    if (!sourceObject) {
      throw new Error(`Source video not found: ${key}`);
    }
    const sourceBuffer = await sourceObject.arrayBuffer();
    await env.ReferenceBucket.put(`${videoFolder}/source.mp4`, sourceBuffer, {
      httpMetadata: { contentType: "video/mp4" },
    });
    await env.ReferenceBucket.delete(key); // Complete the move

    // Save spec.txt (blueprint)
    await env.ReferenceBucket.put(
      `${videoFolder}/spec.txt`,
      analysis.blueprint,
      { httpMetadata: { contentType: "text/plain" } },
    );

    // Save metadata.json
    const metadata = {
      id: videoId,
      originalKey: key,
      type: "video" as const,
      summary: analysis.summary,
      keywords: analysis.keywords,
      industries: analysis.industries,
      duration: analysis.duration,
      aspectRatio: analysis.aspectRatio,
      audio: analysis.audio,
      createdAt: new Date().toISOString(),
    };
    await env.ReferenceBucket.put(
      `${videoFolder}/metadata.json`,
      JSON.stringify(metadata, null, 2),
      { httpMetadata: { contentType: "application/json" } },
    );

    // Create embedding from summary + keywords + industries
    const embeddingText = [
      analysis.summary,
      `Keywords: ${analysis.keywords.join(", ")}`,
      `Industries: ${analysis.industries.join(", ")}`,
    ].join(". ");

    const embedding = await embedText(embeddingText);

    // Index in Vectorize
    await env.ReferenceIndex.upsert([
      {
        id: videoId,
        values: embedding,
        metadata: {
          id: videoId,
          originalKey: key,
          type: "video",
          description: analysis.summary,
          keywords: analysis.keywords,
          industries: analysis.industries,
          duration: analysis.duration,
          aspectRatio: analysis.aspectRatio,
          hasAudio: analysis.audio.isReusable,
          createdAt: metadata.createdAt,
        },
        namespace: "video",
      },
    ]);

    log.info("video processed and indexed", {
      videoId,
      originalKey: key,
      duration: analysis.duration,
      audioReusable: analysis.audio.isReusable,
    });
  }

  /**
   * Process a reference image: analyze with vision model, create folder structure, embed, and index.
   * Creates: images/{id}/source.{ext}, metadata.json
   * Idempotent - skips processing if already indexed.
   */
  export async function processImage(key: string): Promise<void> {
    const env = Binding.use();

    // Generate image ID
    const imageId = ulid();
    const imageFolder = `images/${imageId}`;

    // Check if already processed (by original key)
    if (await exists(key)) {
      log.info("image already indexed by original key, skipping", { key });
      return;
    }

    log.info("processing reference image", { key, imageId });

    // Get image as data URL for vision model
    const imageUrl = await getImageUrl(key);
    log.info("fetched image from R2", {
      key,
      size: Math.round(imageUrl.length / 1024),
    });

    const tags = await analyzeImage(imageUrl);
    log.info("image analyzed", {
      key,
      keywords: tags.keywords.length,
      industries: tags.industries.length,
    });

    // Move source image to folder structure (R2 has no native move, so copy+delete)
    const sourceObject = await env.ReferenceBucket.get(key);
    if (!sourceObject) {
      throw new Error(`Source image not found: ${key}`);
    }
    const sourceBuffer = await sourceObject.arrayBuffer();
    const ext = key.split(".").pop()?.toLowerCase() || "jpg";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    await env.ReferenceBucket.put(
      `${imageFolder}/source.${ext}`,
      sourceBuffer,
      {
        httpMetadata: { contentType: mimeTypes[ext] || "image/jpeg" },
      },
    );
    await env.ReferenceBucket.delete(key); // Complete the move

    // Save metadata.json
    const metadata = {
      id: imageId,
      originalKey: key,
      type: "image" as const,
      description: tags.description,
      keywords: tags.keywords,
      industries: tags.industries,
      sourceExt: ext,
      createdAt: new Date().toISOString(),
    };
    await env.ReferenceBucket.put(
      `${imageFolder}/metadata.json`,
      JSON.stringify(metadata, null, 2),
      { httpMetadata: { contentType: "application/json" } },
    );

    // Create text for embedding: description + keywords + industries
    const embeddingText = [
      tags.description,
      `Keywords: ${tags.keywords.join(", ")}`,
      `Industries: ${tags.industries.join(", ")}`,
    ].join(". ");

    const embedding = await embedText(embeddingText);

    // Index in Vectorize
    await env.ReferenceIndex.upsert([
      {
        id: imageId,
        values: embedding,
        metadata: {
          id: imageId,
          originalKey: key,
          type: "image",
          description: tags.description,
          keywords: tags.keywords,
          industries: tags.industries,
          sourceExt: ext,
          createdAt: metadata.createdAt,
        },
        namespace: "image",
      },
    ]);

    log.info("image processed and indexed", {
      imageId,
      originalKey: key,
      keywords: tags.keywords.length,
      industries: tags.industries.length,
    });
  }

  export async function similarFromProduct(
    productID: string,
    options: ReferenceSearchOptions = {},
  ): Promise<ReferenceSearchResult[]> {
    const product = await EntProduct.fromID(productID);
    const images = product.imageUrls();
    if (images.length === 0) {
      log.error("product has no images for reference search", { productID });
      throw new Error("Product has no images");
    }
    const { query } = await genSearchQueryFromProductImages(images);
    log.info("generated search query from product images", {
      productID,
      query,
    });
    return findSimilar(query, options);
  }

  /**
   * Semantic search for reference images using natural language query.
   */
  export async function findSimilar(
    query: string,
    options: ReferenceSearchOptions = {},
  ): Promise<ReferenceSearchResult[]> {
    const env = Binding.use();
    const { topK = 20, industries, returnValues = false, namespace } = options;

    log.info("searching references", { query, topK, industries });

    const queryVector = await embedText(query);

    const queryOptions: VectorizeQueryOptions = {
      topK,
      returnMetadata: "all",
      returnValues,
      namespace,
    };

    const results = await env.ReferenceIndex.query(queryVector, queryOptions);
    let matches = results.matches.map(toSearchResult);

    // Post-filter by industries if specified
    if (industries && industries.length > 0) {
      matches = matches.filter((m) =>
        m.industries.some((ind) =>
          industries.some(
            (filterInd) => ind.toLowerCase() === filterInd.toLowerCase(),
          ),
        ),
      );
    }

    log.info("search completed", {
      query,
      resultsCount: matches.length,
      topScore: matches[0]?.score,
    });

    return matches;
  }

  /**
   * List all reference images with optional filtering.
   */
  export async function list(
    options: ReferenceSearchOptions = {},
  ): Promise<ReferenceSearchResult[]> {
    const env = Binding.use();
    const { topK = 50, industries } = options;

    // Use zero vector to get results without semantic ranking
    const zeroVector = new Array(768).fill(0);

    const results = await env.ReferenceIndex.query(zeroVector, {
      topK,
      returnMetadata: "all",
    });

    let matches = results.matches.map(toSearchResult);

    if (industries && industries.length > 0) {
      matches = matches.filter((m) =>
        m.industries.some((ind) =>
          industries.some(
            (filterInd) => ind.toLowerCase() === filterInd.toLowerCase(),
          ),
        ),
      );
    }

    return matches;
  }

  /**
   * Get a single reference by ID
   */
  export async function getById(
    id: string,
  ): Promise<ReferenceSearchResult | null> {
    const env = Binding.use();

    const results = await env.ReferenceIndex.getByIds([id]);

    if (!results || results.length === 0) {
      return null;
    }

    const match = results[0];
    const metadata = match.metadata || {};

    return {
      id: match.id,
      score: 1,
      type: (metadata.type as "image" | "video") || "image",
      description: (metadata.description as string) || "",
      keywords: (metadata.keywords as string[]) || [],
      industries: (metadata.industries as string[]) || [],
      createdAt: (metadata.createdAt as string) || "",
    };
  }

  /**
   * Delete a reference from the index
   */
  export async function remove(id: string): Promise<void> {
    try {
      const env = Binding.use();

      await env.ReferenceIndex.deleteByIds([id]);

      log.info("reference deleted", { id });
    } catch (error) {
      log.error("failed to delete reference", { id, error });
    }
  }

  /**
   * List R2 object keys directly (no Vectorize query).
   * Fast operation for UI loading.
   */
  export async function listKeys(limit = 20): Promise<string[]> {
    const env = Binding.use();
    const list = await env.ReferenceBucket.list({ limit });
    return list.objects.map((obj) => obj.key);
  }

  /**
   * Generate a presigned URL for a reference image.
   */
  export async function getPresignedUrl(key: string): Promise<string> {
    return Storage.getPresignedUrl(key, REFERENCE_BUCKET, { expiresIn: 3600 });
  }

  /**
   * Get a video reference with full metadata and blueprint.
   */
  export async function getVideoReference(
    videoId: string,
  ): Promise<VideoReferenceResult | null> {
    const env = Binding.use();

    // Get from vectorize first
    const results = await env.ReferenceIndex.getByIds([videoId]);
    if (!results || results.length === 0) {
      return null;
    }

    const match = results[0];
    const vectorMeta = match.metadata || {};

    // Load full metadata from R2
    const metadataObj = await env.ReferenceBucket.get(
      `videos/${videoId}/metadata.json`,
    );
    if (!metadataObj) {
      log.warn("video metadata.json not found", { videoId });
      return null;
    }

    const metadata = JSON.parse(await metadataObj.text());

    // Load blueprint
    const specObj = await env.ReferenceBucket.get(`videos/${videoId}/spec.txt`);
    const blueprint = specObj ? await specObj.text() : "";

    return {
      id: videoId,
      score: 1,
      type: "video",
      description: metadata.summary || (vectorMeta.description as string) || "",
      keywords: metadata.keywords || [],
      industries: metadata.industries || [],
      createdAt: metadata.createdAt || "",
      blueprint,
      duration: metadata.duration || 0,
      aspectRatio: metadata.aspectRatio || "9:16",
      audio: metadata.audio || {
        type: "music_only",
        mood: "unknown",
        isReusable: false,
        reasoning: "",
      },
    };
  }

  /**
   * Get an image reference with full metadata.
   */
  export async function getImageReference(
    imageId: string,
  ): Promise<ImageReferenceResult | null> {
    const env = Binding.use();

    // Get from vectorize first
    const results = await env.ReferenceIndex.getByIds([imageId]);
    if (!results || results.length === 0) {
      return null;
    }

    const match = results[0];
    const vectorMeta = match.metadata || {};

    // Load full metadata from R2
    const metadataObj = await env.ReferenceBucket.get(
      `images/${imageId}/metadata.json`,
    );
    if (!metadataObj) {
      log.warn("image metadata.json not found", { imageId });
      return null;
    }

    const metadata = JSON.parse(await metadataObj.text());

    return {
      id: imageId,
      score: 1,
      type: "image",
      description:
        metadata.description || (vectorMeta.description as string) || "",
      keywords: metadata.keywords || [],
      industries: metadata.industries || [],
      createdAt: metadata.createdAt || "",
      sourceExt: metadata.sourceExt || "jpg",
    };
  }

  /**
   * Get a reference by ID (unified for both images and videos).
   */
  export async function getReference(
    id: string,
  ): Promise<ImageReferenceResult | VideoReferenceResult | null> {
    const base = await getById(id);
    if (!base) return null;

    if (base.type === "video") {
      return getVideoReference(id);
    } else {
      return getImageReference(id);
    }
  }

  /**
   * Search for video references specifically.
   */
  export async function findSimilarVideos(
    query: string,
    options: ReferenceSearchOptions = {},
  ): Promise<VideoReferenceResult[]> {
    const { topK = 10, industries } = options;

    // Search all references
    const allResults = await findSimilar(query, {
      topK: topK * 3, // Get more to filter
      industries,
    });

    // Filter to videos only
    const videoResults = allResults.filter((r) => r.type === "video");

    // Load full video data for each
    const videos: VideoReferenceResult[] = [];
    for (const result of videoResults.slice(0, topK)) {
      const video = await getVideoReference(result.id);
      if (video) {
        video.score = result.score;
        videos.push(video);
      }
    }

    return videos;
  }
}
