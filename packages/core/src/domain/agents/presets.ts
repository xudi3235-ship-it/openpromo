import { Binding } from "@core/helpers/api-env";
import type { AgentInputItem } from "@openai/agents";
import { ReferenceSearch } from "../reference/reference-search";
import { downloadImagesToTmp } from "./utils";

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

    async getByIDToAgentInput(
      id: string | undefined | null,
    ): Promise<AgentInputItem[]> {
      if (!id) return [];
      const ref = await ReferenceSearch.getById(id);

      if (!ref) {
        throw new Error(`Preset reference not found: ${id}`);
      }
      const msgs: AgentInputItem[] = [];

      if (ref.type === "image") {
        const imgUrl = await ReferenceSearch.getPresignedUrlFromResult(ref);
        const refLocalPaths = await downloadImagesToTmp(
          [imgUrl],
          "/tmp/reference",
        );
        msgs.push({
          role: "user",
          content: [
            {
              type: "input_text" as const,
              text: `User selected a reference image as directional inspiration. ref: ${JSON.stringify(ref)}.
                  
                  Refernce images downloaded to /tmp/reference. Local path: ${refLocalPaths.join(", ")}
                  `,
            },
            {
              type: "input_image" as const,
              image: imgUrl,
            },
          ],
        });
      } else if (ref.type === "video") {
        // load the metadata + spec.txt
        const video = await ReferenceSearch.getVideoReference(id);
        msgs.push({
          role: "system",
          content: `
<preset_blueprint>
**PRESET SELECTED: ${id}**
**ADHERENCE LEVEL: MODERATE-TO-STRICT**

User selected this proven ad format as their template. This blueprint represents a successful, tested ad pattern.

**You MUST:**
1. Follow the shot structure closely (number of shots, timing, pacing)
2. Replicate the hook style (first 2-3 seconds pattern)
3. Match the audio strategy (dialogue style, music placement)
4. Preserve the CTA approach

**Blueprint to Follow:**
${video?.blueprint ?? "No blueprint available"}

**Adherence Checklist (verify before generation):**
- Shot count matches blueprint (+/- 1 shot)
- Hook follows same pattern (visual/dialogue/motion)
- Pacing is similar (fast cuts vs slow flow)
- CTA style matches (text/dialogue/visual)
- Audio approach aligned (voiceover/trending sound/music)

**Allowed Adaptations:**
- Product swap (different product, same presentation style)
- Setting change (different location, same mood/vibe)
- Color palette (match brand colors, keep contrast ratios)
- Talent appearance (different person, same framing/energy)

**NOT Allowed Without Justification:**
- Changing shot structure fundamentally
- Removing or significantly altering the hook pattern
- Changing pacing significantly (fast to slow or vice versa)
- Adding elements not in blueprint without clear reasoning
</preset_blueprint>
`,
        });
        // Also add the raw video reference data for context
        msgs.push({
          role: "user",
          content: [
            {
              type: "input_text" as const,
              text: `Video reference details: ${JSON.stringify(video)}`,
            },
          ],
        });
      } else {
        throw new Error(`Unsupported preset reference type: ${ref.type}`);
      }

      return msgs;
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
