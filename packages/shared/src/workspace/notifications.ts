import { z } from "zod";

// ============ Base Schemas ============

/**
 * Base fields shared by all content notifications
 */
const BaseContentNotificationSchema = z.object({
  contentId: z.string(),
  placement: z.string(),
});

// ============ Notification Type Schemas ============

export const ContentPublishedNotificationSchema =
  BaseContentNotificationSchema.extend({
    type: z.literal("content.published"),
    sourceContentId: z.string().nullish(),
    shareUrl: z.string().url().optional(),
    publishedAt: z.string(),
  });

export const ContentFailedNotificationSchema =
  BaseContentNotificationSchema.extend({
    type: z.literal("content.failed"),
    errorMessage: z.string().optional(),
    failedAt: z.string(),
    groupId: z.string().nullish(),
    isGroupFullyFailed: z.boolean().optional(),
  });

// ============ Union Schema ============

export const WorkspaceNotificationSchema = z.discriminatedUnion("type", [
  ContentPublishedNotificationSchema,
  ContentFailedNotificationSchema,
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
