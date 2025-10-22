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

export const STATIC_USER_ENTITIES: TaggableEntity[] = [
  {
    id: "1",
    name: "John Doe",
    value: "@johndoe",
    description: "Product Manager",
    type: "user",
  },
  {
    id: "2",
    name: "Jane Smith",
    value: "@janesmith",
    description: "Marketing Lead",
    type: "user",
  },
  {
    id: "3",
    name: "Bob Johnson",
    value: "@bobjohnson",
    description: "Sales Director",
    type: "user",
  },
  {
    id: "4",
    name: "Alice Williams",
    value: "@alicewilliams",
    description: "Content Creator",
    type: "user",
  },
  {
    id: "5",
    name: "Charlie Brown",
    value: "@charliebrown",
    description: "Social Media Manager",
    type: "user",
  },
];
