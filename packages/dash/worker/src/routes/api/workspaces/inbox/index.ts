import type { ApiEnv } from "@core/helpers/api-env";
import type {
  InboxConversationSummarySchema,
  InboxMessageSchema,
} from "@shared/inbox";
import { Hono } from "hono";
import type * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { inboxGetConversationRoute } from "./routes/inbox-get-conversation";
import { inboxGetConversationsRoute } from "./routes/inbox-get-conversations";
import { inboxGetMessagesRoute } from "./routes/inbox-get-messages";
import { inboxPostMessageRoute } from "./routes/inbox-post-message";

export const inboxRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_viewer"))
  .route("/conversations", inboxGetConversationsRoute)
  .route("/conversations", inboxGetConversationRoute)
  .route("/conversations", inboxGetMessagesRoute)
  .use(withWorkspaceRole("workspace_editor"))
  .route("/conversations", inboxPostMessageRoute);

export type InboxConversationsList = {
  items: z.infer<typeof InboxConversationSummarySchema>[];
  page: number;
  pageSize: number;
  total: number;
};

export type InboxMessagesList = {
  items: z.infer<typeof InboxMessageSchema>[];
  page: number;
  pageSize: number;
  total: number;
};
