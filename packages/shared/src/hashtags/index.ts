import { AllPlatformsZod } from "@shared/content";
import z from "zod";

export const HashtagSuggestionStat = z.object({
  platform: AllPlatformsZod,
  usageCount: z.number().optional(),
  viewCount: z.number().optional(),
  lastFetchedAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type HashtagSuggestionStat = z.infer<typeof HashtagSuggestionStat>;

export const HashtagSuggestion = z.object({
  normalizedTag: z.string(),
  displayTag: z.string().optional(),
  stats: z.array(HashtagSuggestionStat),
});

export type HashtagSuggestion = z.infer<typeof HashtagSuggestion>;

export const HashtagSearchResponse = z.object({
  query: z.string(),
  suggestions: z.array(HashtagSuggestion),
  stale: z.boolean().optional(),
});

export type HashtagSearchResponse = z.infer<typeof HashtagSearchResponse>;

export const HashtagPlatformQuota = z.object({
  platform: AllPlatformsZod,
  remaining: z.number().optional(),
  resetAt: z.coerce.date().optional(),
});

export type HashtagPlatformQuota = z.infer<typeof HashtagPlatformQuota>;
