import { openai } from "@ai-sdk/openai";
import { Binding } from "@core/helpers/api-env";
import { Log } from "@core/utils/log";
import { generateObject, type ImagePart } from "ai";
import { z } from "zod";

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
 * Search result from Vectorize
 */
export interface ReferenceSearchResult {
  id: string;
  score: number;
  description: string;
  keywords: string[];
  industries: string[];
  createdAt: string;
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

Analyze the provided image and extract:
1. A concise description (1-2 sentences) focusing on visual style, composition, and subjects
2. Keywords covering: visual style, mood/tone, subjects/objects, color palette, composition type, any notable elements and successful features
3. Relevant industries this image would be useful for as ad creative reference

Be specific and practical - these tags will be used to search and match images to product categories.
</Task>

<Rules>
1. critical to be accurate and concise when tagging, as these tags will determine search relevancy
2. use a progressive pattern: for industry, start broad 1-2, then more specific 3-5; similarly for keywords, take the progressive tagging approach.
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
   * Process a reference image: analyze with vision model, embed, and store in Vectorize.
   * Idempotent - skips processing if already indexed.
   */
  export async function processImage(key: string): Promise<void> {
    const env = Binding.use();

    // Check if already indexed (idempotent)
    if (await exists(key)) {
      log.info("reference image already indexed, skipping", { key });
      return;
    }

    log.info("processing reference image", { key });

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

    // Create text for embedding: description + keywords + industries
    const embeddingText = [
      tags.description,
      `Keywords: ${tags.keywords.join(", ")}`,
      `Industries: ${tags.industries.join(", ")}`,
    ].join(". ");

    const embedding = await embedText(embeddingText);

    // Prepare metadata
    const metadata: Record<string, string | string[]> = {
      id: key,
      description: tags.description,
      keywords: tags.keywords,
      industries: tags.industries,
      createdAt: new Date().toISOString(),
    };

    // Upsert to Vectorize
    await env.ReferenceIndex.upsert([
      {
        id: key,
        values: embedding,
        metadata,
      },
    ]);

    log.info("reference image processed and indexed", {
      key,
      keywords: tags.keywords.length,
      industries: tags.industries.length,
    });
  }

  /**
   * Semantic search for reference images using natural language query.
   */
  export async function findSimilar(
    query: string,
    options: ReferenceSearchOptions = {},
  ): Promise<ReferenceSearchResult[]> {
    const env = Binding.use();
    const { topK = 20, industries, returnValues = false } = options;

    log.info("searching references", { query, topK, industries });

    const queryVector = await embedText(query);

    const queryOptions: VectorizeQueryOptions = {
      topK,
      returnMetadata: "all",
      returnValues,
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
}
