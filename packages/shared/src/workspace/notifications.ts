import { z } from "zod";

export const ContentPublishedNotificationSchema = z.object({
  type: z.literal("content.published"),
  contentId: z.string(),
  placement: z.string(),
  sourceContentId: z.string().nullish(),
  shareUrl: z.string().url().optional(),
  publishedAt: z.string(),
});

export const WorkspaceNotificationSchema = z.discriminatedUnion("type", [
  ContentPublishedNotificationSchema,
]);

export type WorkspaceNotification = z.infer<typeof WorkspaceNotificationSchema>;

export const WorkspaceNotificationEnvelopeSchema = z.object({
  type: z.literal("notification"),
  workspaceSlug: z.string(),
  timestamp: z.number(),
  notification: WorkspaceNotificationSchema,
});

export type WorkspaceNotificationEnvelope = z.infer<
  typeof WorkspaceNotificationEnvelopeSchema
>;
