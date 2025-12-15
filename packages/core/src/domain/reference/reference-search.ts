import { openai } from "@ai-sdk/openai";
import { R2Bucket } from "@core/containers";
import { Binding } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import { Log } from "@core/utils/log";
import { generateObject, type ImagePart } from "ai";
import { z } from "zod";
import { EntProduct } from "../product";
import { analyzeReferenceVideo } from "./video-analyzer";

const REFERENCE_BUCKET = "openpromo-reference";

const log = Log.create({ namespace: "reference-search" });

/**
 * Centralized path construction for R2 keys.
 * Clients deal with IDs only - all path logic is encapsulated here.
 */
const PATHS = {
  image: (id: string) => `images/${id}/source.jpg`,
  video: (id: string) => `videos/${id}/source.mp4`,
  imageMetadata: (id: string) => `images/${id}/metadata.json`,
  videoMetadata: (id: string) => `videos/${id}/metadata.json`,
  videoSpec: (id: string) => `videos/${id}/spec.txt`,
  videoThumbnail: (id: string) => `videos/${id}/thumbnail.jpg`,
} as const;

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
  imageUrl?: string; // Presigned URL for display
}

/**
 * Image reference (standardized to .jpg)
 */
export interface ImageReferenceResult extends ReferenceSearchResult {
  type: "image";
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
  thumbnailUrl?: string;
}

/**
 * Search options for reference images
 */
export interface ReferenceSearchOptions {
  /** Maximum number of results to return */
  topK?: number;
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
 * Add presigned URLs to search results for display
 */
async function addImageUrls(
  results: ReferenceSearchResult[],
): Promise<ReferenceSearchResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const key =
        result.type === "video"
          ? PATHS.video(result.id)
          : PATHS.image(result.id);
      const imageUrl = await Storage.getPresignedUrl(key, REFERENCE_BUCKET, {
        expiresIn: 3600,
      });
      return { ...result, imageUrl };
    }),
  );
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
   * Process a reference video: analyze with Gemini, create folder structure, embed, and index.
   * Creates: videos/{hash}/source.mp4, spec.txt, metadata.json
   * Uses content hash for deduplication - identical videos share the same folder.
   */
  export async function processVideo(key: string): Promise<void> {
    const env = Binding.use();

    // Get source file first to compute hash
    const sourceObject = await env.ReferenceBucket.get(key);
    if (!sourceObject) {
      throw new Error(`Source video not found: ${key}`);
    }
    const sourceBuffer = await sourceObject.arrayBuffer();

    // Compute SHA-256 hash for content-addressable storage
    // Truncate to 32 chars (16 bytes) to stay within Vectorize's 64-byte ID limit
    const hashBuffer = await crypto.subtle.digest("SHA-256", sourceBuffer);
    const fullHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hash = fullHash.slice(0, 32);

    // Check if already processed (by content hash) - use PATHS helper
    const existing = await env.ReferenceBucket.head(PATHS.video(hash));
    if (existing) {
      log.info("duplicate content, skipping", { key, hash });
      await env.ReferenceBucket.delete(key); // cleanup ingest/
      return;
    }

    log.info("processing reference video", { key, hash });

    // Analyze video with Gemini
    const analysis = await analyzeReferenceVideo(key);

    // Store source video - use PATHS helper
    await env.ReferenceBucket.put(PATHS.video(hash), sourceBuffer, {
      httpMetadata: { contentType: "video/mp4" },
    });
    await env.ReferenceBucket.delete(key); // cleanup ingest/

    // Save spec.txt (blueprint)
    await env.ReferenceBucket.put(PATHS.videoSpec(hash), analysis.blueprint, {
      httpMetadata: { contentType: "text/plain" },
    });

    // Save metadata.json
    const metadata = {
      id: hash,
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
      PATHS.videoMetadata(hash),
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

    // Index in Vectorize (use hash as ID)
    await env.ReferenceIndex.upsert([
      {
        id: hash,
        values: embedding,
        metadata: {
          id: hash,
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
      hash,
      duration: analysis.duration,
      audioReusable: analysis.audio.isReusable,
    });

    // Generate thumbnail (soft fail - don't block processing)
    try {
      const container = env.ContainerBackend.getByName("default");
      const presignedUrl = await Storage.getPresignedUrl(
        PATHS.video(hash),
        REFERENCE_BUCKET,
        { expiresIn: 3600 },
      );

      await container.extractFrames({
        videoUrl: presignedUrl,
        timestamps: [0.5], // First second - captures the hook/opening
        outputPrefix: `videos/${hash}/`,
        outputFilename: "thumbnail.jpg",
        bucket: R2Bucket.REFERENCE,
      });

      log.info("thumbnail generated", { hash });
    } catch (err) {
      log.warn("thumbnail generation failed, continuing", { hash, error: err });
    }
  }

  /**
   * Process a reference image: analyze with vision model, create folder structure, embed, and index.
   * Creates: images/{hash}/source.jpg, metadata.json (standardized to .jpg)
   * Uses content hash for deduplication - identical images share the same folder.
   */
  export async function processImage(key: string): Promise<void> {
    const env = Binding.use();

    // Get source file first to compute hash
    const sourceObject = await env.ReferenceBucket.get(key);
    if (!sourceObject) {
      throw new Error(`Source image not found: ${key}`);
    }
    const sourceBuffer = await sourceObject.arrayBuffer();

    // Compute SHA-256 hash for content-addressable storage
    // Truncate to 32 chars (16 bytes) to stay within Vectorize's 64-byte ID limit
    const hashBuffer = await crypto.subtle.digest("SHA-256", sourceBuffer);
    const fullHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hash = fullHash.slice(0, 32);

    // Check if already processed (by content hash) - use PATHS helper
    const existing = await env.ReferenceBucket.head(PATHS.image(hash));
    if (existing) {
      log.info("duplicate content, skipping", { key, hash });
      await env.ReferenceBucket.delete(key); // cleanup ingest/
      return;
    }

    log.info("processing reference image", { key, hash });

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

    // Store source image - standardized to .jpg
    await env.ReferenceBucket.put(PATHS.image(hash), sourceBuffer, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.ReferenceBucket.delete(key); // cleanup ingest/

    // Save metadata.json
    const metadata = {
      id: hash,
      type: "image" as const,
      description: tags.description,
      keywords: tags.keywords,
      industries: tags.industries,
      createdAt: new Date().toISOString(),
    };
    await env.ReferenceBucket.put(
      PATHS.imageMetadata(hash),
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

    // Index in Vectorize (use hash as ID)
    await env.ReferenceIndex.upsert([
      {
        id: hash,
        values: embedding,
        metadata: {
          id: hash,
          type: "image",
          description: tags.description,
          keywords: tags.keywords,
          industries: tags.industries,
          createdAt: metadata.createdAt,
        },
        namespace: "image",
      },
    ]);

    log.info("image processed and indexed", {
      hash,
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
    const { topK = 20, returnValues = false, namespace } = options;

    log.info("searching references", { query, topK });

    const queryVector = await embedText(query);

    const queryOptions: VectorizeQueryOptions = {
      topK,
      returnMetadata: "all",
      returnValues,
      namespace,
    };

    const results = await env.ReferenceIndex.query(queryVector, queryOptions);
    const matches = results.matches.map(toSearchResult);

    log.info("search completed", {
      query,
      resultsCount: matches.length,
      topScore: matches[0]?.score,
    });

    // Add presigned URLs for display
    return addImageUrls(matches);
  }

  /**
   * List all reference images with optional filtering.
   */
  export async function list(
    options: ReferenceSearchOptions = {},
  ): Promise<ReferenceSearchResult[]> {
    const env = Binding.use();
    const { topK = 50 } = options;

    // Use zero vector to get results without semantic ranking
    const zeroVector = new Array(768).fill(0);

    const results = await env.ReferenceIndex.query(zeroVector, {
      topK,
      returnMetadata: "all",
    });

    const matches = results.matches.map(toSearchResult);

    // Add presigned URLs for display
    return addImageUrls(matches);
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
   * Delete a reference from the index.
   * Accepts either a hash ID or an R2 key path like "images/{hash}/source.jpg"
   */
  export async function remove(idOrKey: string): Promise<void> {
    try {
      const env = Binding.use();

      // Extract hash from R2 key path if needed
      // Pattern: images/{hash}/source.{ext} or videos/{hash}/source.mp4
      let id = idOrKey;
      const pathMatch = idOrKey.match(/^(?:images|videos)\/([^/]+)\//);
      if (pathMatch) {
        id = pathMatch[1];
      }

      await env.ReferenceIndex.deleteByIds([id]);

      log.info("reference deleted", { id, originalKey: idOrKey });
    } catch (error) {
      log.error("might already be deleted, ok", { id: idOrKey, error });
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

  export async function getPresignedUrlFromResult(
    result: ReferenceSearchResult,
  ): Promise<string> {
    const key =
      result.type === "video" ? PATHS.video(result.id) : PATHS.image(result.id);
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
      PATHS.videoMetadata(videoId),
    );
    if (!metadataObj) {
      log.warn("video metadata.json not found", { videoId });
      return null;
    }

    const metadata = JSON.parse(await metadataObj.text());

    // Load blueprint
    const specObj = await env.ReferenceBucket.get(PATHS.videoSpec(videoId));
    const blueprint = specObj ? await specObj.text() : "";

    // Check if thumbnail exists and get presigned URL
    const thumbnailKey = PATHS.videoThumbnail(videoId);
    const thumbnailExists = await env.ReferenceBucket.head(thumbnailKey);
    const thumbnailUrl = thumbnailExists
      ? await Storage.getPresignedUrl(thumbnailKey, REFERENCE_BUCKET, {
          expiresIn: 3600,
        })
      : undefined;

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
      thumbnailUrl,
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
      PATHS.imageMetadata(imageId),
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
    const { topK = 10 } = options;

    // Search all references
    const allResults = await findSimilar(query, {
      topK: topK * 3, // Get more to filter
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
