import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "@/components/inbox";
import { prefetchInboxConversations } from "@/queries/inbox/conversations";
export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox",
)({
  loader: ({ params, context }) => {
    prefetchInboxConversations(context.queryClient, params.workspaceSlug);
  },
  component: Inbox,
});
