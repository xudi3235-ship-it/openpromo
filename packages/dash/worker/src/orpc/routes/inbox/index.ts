import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { orpcBuilder } from "../../context";
import {
  assignConversation,
  createNote,
  deleteNote,
  listNotes,
  updateContact,
  updateLabels,
  updatePriority,
  updateStatus,
} from "./collab";
import { deleteConversation } from "./delete-conversation";
import { getConversation } from "./get-conversation";
import { getUnreadCount } from "./get-unread-count";
import { listConversations } from "./list-conversations";
import { listMessages } from "./list-messages";
import { markConversationRead, markConversationUnread } from "./mark-read";
import { sendMessage } from "./send-message";

export const inboxRouter = orpcBuilder.router({
  deleteConversation,
  assignConversation,
  updateLabels,
  updatePriority,
  updateStatus,
  updateContact,
  listNotes,
  createNote,
  deleteNote,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  markConversationUnread,
  getUnreadCount,
});

export type InboxRouterInputs = InferRouterInputs<typeof inboxRouter>;
export type InboxRouterOutputs = InferRouterOutputs<typeof inboxRouter>;
