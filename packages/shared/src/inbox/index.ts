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

const FBMessagePayload = z.object({
  platform: z.literal("FACEBOOK"),
  sender: z.object({
    id: z.string(), // PSID
  }),
  recipient: z.object({
    id: z.string(), // Page ID
  }),
  timestamp: z.number(),
  message: z.object({
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
  }),
});

export type FBMessagePayload = z.infer<typeof FBMessagePayload>;

const IGMessagePayload = z.object({
  platform: z.literal("INSTAGRAM"),
  sender: z.object({
    id: z.string(), // IGSID - Instagram-scoped ID for the customer who sent the message
  }),
  recipient: z.object({
    id: z.string(), // IGID - ID of the Instagram professional account
  }),
  timestamp: z.number(),
  reply_to: z
    .union([
      z.object({
        mid: z.string(),
      }),
      z.object({
        story: z.object({
          id: z.string(), // Story ID
          url: z.string(), // Story CDN URL
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

export type IGMessagePayload = z.infer<typeof IGMessagePayload>;

export const MessagePayload = z.discriminatedUnion("platform", [
  FBMessagePayload,
  IGMessagePayload,
]);

export type MessagePayload = z.infer<typeof MessagePayload>;
