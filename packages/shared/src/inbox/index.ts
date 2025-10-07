import * as z from "zod";

export const FBMessageAttachmentTypes = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
  REEL: "reel",
  IG_REEL: "ig_reel",
} as const;

export const IGMessageAttachmentTypes = {
  ...FBMessageAttachmentTypes,
  SHARE: "share",
  STORY_MENTION: "story_mention",
} as const;

export const AllMessageAttachmentTypes = {
  ...FBMessageAttachmentTypes,
  ...IGMessageAttachmentTypes,
} as const;

export const FBMessagePayload = z.object({
  sender: z.object({
    /** PSID - Page-scoped ID for the user who sent the message */
    id: z.string(),
  }),
  recipient: z.object({
    /** Page ID */
    id: z.string(),
  }),
  timestamp: z.number(),
  message: z
    .object({
      is_echo: z.boolean().optional(),
      mid: z.string(),
      text: z.string().optional(),
      reply_to: z
        .object({
          mid: z.string(),
        })
        .optional(),
      attachments: z
        .array(
          z.object({
            type: z.enum(FBMessageAttachmentTypes),
            payload: z.object({ url: z.string() }),
          }),
        )
        .optional(),
    })
    .optional(),
  message_edit: z
    .object({
      mid: z.string(),
      text: z.string(),
      num_edit: z.number(),
    })
    .optional(),
});

export const FBWebhookPayload = z.object({
  object: z.literal("page"),
  entry: z.array(
    z.object({
      /** Page ID */
      id: z.string(),
      messaging: z.array(FBMessagePayload),
    }),
  ),
});

export type FBMessagePayload = z.infer<typeof FBMessagePayload>;
export type FBWebhookPayload = z.infer<typeof FBWebhookPayload>;

export const IGMessagePayload = z.object({
  sender: z.object({
    /** IGSID - Instagram-scoped ID for the user who sent the message */
    id: z.string(),
  }),
  recipient: z.object({
    /** IGID - ID of the Instagram professional account */
    id: z.string(),
  }),
  timestamp: z.number(),
  reply_to: z
    .union([
      z.object({
        mid: z.string(),
      }),
      z.object({
        story: z.object({
          id: z.string(),
          url: z.string(),
        }),
      }),
    ])
    .optional(),
  message: z
    .object({
      is_echo: z.boolean().optional(),
      mid: z.string(),
      text: z.string().optional(),
      attachments: z
        .array(
          z.object({
            type: z.enum(IGMessageAttachmentTypes),
            payload: z.object({ url: z.string() }),
          }),
        )
        .optional(),
    })
    .optional(),
  message_edit: z
    .object({
      mid: z.string(),
      text: z.string(),
      num_edit: z.number(),
    })
    .optional(),
});

const IGWebhookPayload = z.object({
  object: z.literal("instagram"),
  entry: z.array(
    z.object({
      /** IGID - ID of the Instagram professional account */
      id: z.string(),
      messaging: z.array(IGMessagePayload),
    }),
  ),
});

export type IGMessagePayload = z.infer<typeof IGMessagePayload>;
export type IGWebhookPayload = z.infer<typeof IGWebhookPayload>;

export const MessagePayload = z.union([FBMessagePayload, IGMessagePayload]);

export type MessagePayload = z.infer<typeof MessagePayload>;

// ===== Unified Inbox API/Realtime shared types =====

// Keep platform strings aligned with core connected-account Platform
export const InboxPlatform = z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]);
export type InboxPlatform = z.infer<typeof InboxPlatform>;

export const InboxAttachment = z.object({
  type: z.enum(AllMessageAttachmentTypes),
  url: z.string(),
});
export type InboxAttachment = z.infer<typeof InboxAttachment>;

export const InboxMessageSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  sender: z.enum(["user", "self"]),
  text: z.string().nullable(),
  attachments: z.array(InboxAttachment),
  createdAt: z.coerce.date(),
});
export type InboxMessage = z.infer<typeof InboxMessageSchema>;

export const InboxContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePicUrl: z.string(),
});
export type InboxContact = z.infer<typeof InboxContactSchema>;

export const InboxConnectedAccountSummary = z.object({
  id: z.string(),
  accountName: z.string().nullable(),
});
export type InboxConnectedAccountSummary = z.infer<
  typeof InboxConnectedAccountSummary
>;

export const InboxConversationSummarySchema = z.object({
  id: z.string(),
  platform: InboxPlatform,
  lastMessageAt: z.coerce.date(),
  contact: InboxContactSchema,
  connectedAccount: InboxConnectedAccountSummary,
});
export type InboxConversationSummary = z.infer<
  typeof InboxConversationSummarySchema
>;

// Realtime events over WorkspacePusher
export const InboxConversationUpsertedEvent = z.object({
  type: z.literal("inbox.conversation.upserted"),
  conversationId: z.string(),
  lastMessageAt: z.coerce.date(),
  platform: InboxPlatform,
  contact: InboxContactSchema,
});

export const InboxMessageUpsertedEvent = z.object({
  type: z.literal("inbox.message.upserted"),
  conversationId: z.string(),
  message: InboxMessageSchema,
});

export const InboxRealtimeEvent = z.union([
  InboxConversationUpsertedEvent,
  InboxMessageUpsertedEvent,
]);
export type InboxRealtimeEvent = z.infer<typeof InboxRealtimeEvent>;
