import {
  InboxConversationSummarySchema,
  InboxMessageSchema,
} from "@shared/inbox";
import { z } from "zod";

export const InboxConversationsListSchema = z.object({
  items: z.array(InboxConversationSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});
export type InboxConversationsList = z.infer<
  typeof InboxConversationsListSchema
>;

export const InboxMessagesListSchema = z.object({
  items: z.array(InboxMessageSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});
export type InboxMessagesList = z.infer<typeof InboxMessagesListSchema>;
