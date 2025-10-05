import * as z from "zod";
import { AllPlatforms } from "../content";

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
  platform: z.literal(AllPlatforms.FACEBOOK),
  sender: z.object({
    /** PSID - Page-scoped ID for the user who sent the message */
    id: z.string(),
  }),
  recipient: z.object({
    /** Page ID */
    id: z.string(),
  }),
  timestamp: z.number(),
  message_edit: z
    .object({
      mid: z.string(),
      text: z.string(),
      num_edit: z.number(),
    })
    .optional(),
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
  platform: z.literal(AllPlatforms.INSTAGRAM),
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
  message: z.object({
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
  }),
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

export const MessagePayload = z.discriminatedUnion("platform", [
  FBMessagePayload,
  IGMessagePayload,
]);

export type MessagePayload = z.infer<typeof MessagePayload>;
