import { z } from "zod";

export const popupRelaySchema = z.object({
  status: z.enum(["success", "error"]),
  event: z.enum(["connected_account"]),
  message: z.string(),
});

export type PopupRelayPayload = z.infer<typeof popupRelaySchema>;

/**
 * Message sent from the popup to the parent window
 */
export const popupRelayMessageSchema = z.object({
  source: z.literal("openpromo"),
  payload: popupRelaySchema,
});
