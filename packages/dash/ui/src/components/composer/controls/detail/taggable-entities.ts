import type { HashtagSuggestionStat } from "@shared/hashtags";

export type MentionTrigger = "@" | "#" | null;

export interface TaggableEntity {
  id: string;
  name: string;
  value: string;
  description?: string;
  type: "user" | "hashtag";
  meta?: string[];
  platformStats?: HashtagSuggestionStat[];
}

// Empty array - user mentions will be available in a future update
export const STATIC_USER_ENTITIES: TaggableEntity[] = [];
