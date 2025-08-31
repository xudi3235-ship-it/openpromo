import z from "zod";
import { Actor } from "../../../actor";
import { AllPlacement } from ".";

/**
 * platform agnostic schemas for contents
 */
// Base attachment schema
export const BaseAttachmentSpec = z.object({
  id: z.string().optional(),
  presignedUrl: z.string().optional(),
  s3Key: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});

// Photo attachment
export const PhotoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("photo"),
  width: z.number().optional(),
  height: z.number().optional(),
  altText: z.string().optional(),
});

// Video attachment
export const VideoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("video"),
  duration: z.number().optional(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// Union of all attachment types
export const SharedAttachmentSpec = z.discriminatedUnion("type", [
  PhotoAttachmentSpec,
  VideoAttachmentSpec,
]);

/**
 * base spec for all content placements. Platform specific children will extend
 * this and override the fields. On high level, we break down to the following
 * 1. actor context, workspace-scoped actor for this action.
 * 2. normalized fields. This is for
 */
export const BasePlacementSpec = z.object({
  actor: Actor.WorkspaceUserSchema, // scoped under workspace user
  // normalized fields.
  placement: z.enum([...Object.values(AllPlacement)]),
  title: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type BasePlacementSpec = z.infer<typeof BasePlacementSpec>;
