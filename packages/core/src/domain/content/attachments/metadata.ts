import { ContentPublishingStatusZod } from "@core/schemas/content.sql";
import { z } from "zod";

export const AttachmentMetadataSchema = z
  .object({
    opWorkspaceId: z.string(),
    opContentId: z.string(),
    opPlacement: z.string(),
    opStatus: ContentPublishingStatusZod,
    opLocalAssetDeleted: z.boolean(),
    opRemoteAssetId: z.string(),
    opRemotePlatform: z.string(),
    opUpdatedAt: z.string(),
  })
  .partial();

export type AttachmentMetadata = z.infer<typeof AttachmentMetadataSchema>;

export function buildAttachmentMetadata(
  input: AttachmentMetadata,
): AttachmentMetadata {
  const entries = Object.entries(input).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  if (entries.length === 0) return {};
  return AttachmentMetadataSchema.parse(Object.fromEntries(entries));
}

export function extractAttachmentMetadata(value: unknown): AttachmentMetadata {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key]) => key.startsWith("op"),
  );
  if (entries.length === 0) return {};
  return AttachmentMetadataSchema.parse(Object.fromEntries(entries));
}

export function mergeAttachmentMetadata(
  current: unknown,
  updates: AttachmentMetadata,
): Record<string, unknown> {
  const existing =
    current && typeof current === "object"
      ? { ...(current as Record<string, unknown>) }
      : {};
  const sanitized = buildAttachmentMetadata(updates);
  if (Object.keys(sanitized).length === 0) {
    return existing;
  }
  return {
    ...existing,
    ...sanitized,
  };
}
