import * as z from "zod";

export const metaWebhookGetQuerySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.challenge": z.string(),
  "hub.verify_token": z.string(),
});
