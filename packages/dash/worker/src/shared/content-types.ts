import {
  PendingContentGroupSelect,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import * as z from "zod";

export const GroupEntity = z.object({
  type: z.literal("group"),
  entity: PendingContentGroupSelect,
  contents: UnifiedContentSelect.array(),
});

export const ContentEntity = z.object({
  type: z.literal("content"),
  entity: UnifiedContentSelect,
});

export const MergedContentContainer = z.discriminatedUnion("type", [
  ContentEntity,
  GroupEntity,
]);

export type GroupEntity = z.infer<typeof GroupEntity>;
export type ContentEntity = z.infer<typeof ContentEntity>;
export type MergedContentEntity = z.infer<typeof MergedContentContainer>;
export type MergedContentContainer = z.infer<typeof MergedContentContainer>;
