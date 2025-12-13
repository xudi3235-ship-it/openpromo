import { ReferenceSearch } from "../reference/reference-search";

export namespace Presets {
  /**
   * Reference item from the R2 bucket with Vectorize metadata.
   * Used for UI display and agent context.
   */
  export type Reference = {
    id: string;
    url: string;
    description: string;
    keywords: string[];
    industries: string[];
  };

  /**
   * Loads references from R2 bucket for UI and agent use.
   */
  export class Manager {
    constructor() {}

    /**
     * Load all references for UI display.
     * Lists from R2 directly (fast), then fetches metadata from Vectorize.
     */
    async list(limit = 20): Promise<Reference[]> {
      const results = await ReferenceSearch.list({ topK: limit });

      return Promise.all(
        results.map(async (r) => ({
          id: r.id,
          url: await ReferenceSearch.getPresignedUrl(r.id),
          description: r.description,
          keywords: r.keywords,
          industries: r.industries,
        })),
      );
    }

    /**
     * Get a single reference by ID.
     */
    async getByID(id: string): Promise<Reference | null> {
      const result = await ReferenceSearch.getById(id);
      if (!result) return null;

      return {
        id: result.id,
        url: await ReferenceSearch.getPresignedUrl(result.id),
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
          url: await ReferenceSearch.getPresignedUrl(r.id),
          description: r.description,
          keywords: r.keywords,
          industries: r.industries,
        })),
      );
    }
  }
}
