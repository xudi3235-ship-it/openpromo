import { z } from "zod";

/**
 * Query params schema for /popup-relay route
 */
export const popupRelayQuerySchema = z.object({
  status: z.enum(["success", "error"]),
  event: z.enum(["connected_account"]),
  message: z.string(),
});

export type PopupRelayQuery = z.infer<typeof popupRelayQuerySchema>;

/**
 * Message sent from the popup to the parent window via window.postMessage
 */
export const popupRelayMessageSchema = z.object({
  source: z.literal("openpromo"),
  payload: popupRelayQuerySchema,
});
