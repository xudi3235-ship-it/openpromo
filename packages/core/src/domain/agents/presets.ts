import { Binding } from "@core/helpers/api-env";
import { ReferenceSearch } from "../reference/reference-search";

const CACHE_KEY_PREFIX = "presets:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours (presigned URLs expire)
const CACHE_VERSION = 1;
const CACHE_ENABLED = false; // Toggle to enable KV caching

type CachePayload = {
  version: number;
  references: Presets.Reference[];
};

class KvPresetsCache {
  private getNamespace(): KVNamespace | null {
    try {
      return Binding.use().KV;
    } catch {
      return null;
    }
  }

  private getKey(limit: number) {
    return `${CACHE_KEY_PREFIX}list:${limit}`;
  }

  async get(limit: number): Promise<Presets.Reference[] | null> {
    if (!CACHE_ENABLED) return null;
    const kv = this.getNamespace();
    if (!kv) return null;

    try {
      const raw = await kv.get(this.getKey(limit));
      if (!raw) return null;

      const payload = JSON.parse(raw) as CachePayload;
      if (payload.version !== CACHE_VERSION) return null;

      return payload.references;
    } catch (error) {
      console.warn("presets cache read failed", error);
      return null;
    }
  }

  async set(limit: number, references: Presets.Reference[]): Promise<void> {
    if (!CACHE_ENABLED) return;
    const kv = this.getNamespace();
    if (!kv) return;

    try {
      const payload: CachePayload = {
        version: CACHE_VERSION,
        references,
      };

      await kv.put(this.getKey(limit), JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch (error) {
      console.warn("presets cache write failed", error);
    }
  }
}

export namespace Presets {
  /**
   * Reference item from the R2 bucket with Vectorize metadata.
   * Used for UI display and agent context.
   */
  export type Reference = {
    type: "image" | "video";
    id: string;
    url: string;
    description: string;
    keywords: string[];
    industries: string[];
  };

  /**
   * Loads references from R2 bucket for UI and agent use.
   * Caches list results in KV for performance.
   */
  export class Manager {
    private cache = new KvPresetsCache();

    constructor() {}

    /**
     * Load all references for UI display.
     * Checks KV cache first, then falls back to Vectorize + R2.
     */
    async list(limit = 20): Promise<Reference[]> {
      // Check KV cache first
      const cached = await this.cache.get(limit);
      if (cached) {
        return cached;
      }

      // Fetch from Vectorize + R2
      const results = await ReferenceSearch.list({ topK: limit });

      const references = await Promise.all(
        results.map(async (r) => ({
          id: r.id,
          url: await ReferenceSearch.getPresignedUrlFromResult(r),
          description: r.description,
          keywords: r.keywords,
          industries: r.industries,
          type: r.type,
        })),
      );

      // Store in KV cache
      await this.cache.set(limit, references);

      return references;
    }

    /**
     * Get a single reference by ID.
     */
    async getByID(id: string): Promise<Reference | null> {
      const result = await ReferenceSearch.getById(id);
      if (!result) return null;

      return {
        id: result.id,
        type: result.type,
        url: await ReferenceSearch.getPresignedUrlFromResult(result),
        description: result.description,
        keywords: result.keywords,
        industries: result.industries,
      };
    }

    /**
     * Search references by query (semantic search).
     */
    async search(query: string, limit = 10): Promise<Reference[]> {
      const results = await ReferenceSearch.findSimilar(query, { topK: limit });

      return Promise.all(
        results.map(async (r) => ({
          id: r.id,
          type: r.type,
          url: await ReferenceSearch.getPresignedUrlFromResult(r),
          description: r.description,
          keywords: r.keywords,
          industries: r.industries,
        })),
      );
    }
  }
}
