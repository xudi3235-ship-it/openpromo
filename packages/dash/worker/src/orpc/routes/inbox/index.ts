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

export const inboxRouter = {
  deleteConversation,
  assignConversation,
  updateLabels,
  updatePriority,
  updateStatus,
  updateContact,
  listNotes,
  createNote,
  deleteNote,
};
