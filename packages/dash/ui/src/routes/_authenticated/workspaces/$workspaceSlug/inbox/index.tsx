import { createFileRoute } from "@tanstack/react-router";
import { InboxList } from "@/components/inbox/inbox-list";
import { InboxPendingComponent } from "@/components/inbox/inbox-pending";
import { prefetchInboxConversations } from "@/queries/inbox/conversations";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox/",
)({
  loaderDeps: ({ search }) => ({
    channel: search.channel,
    platform: search.platform,
    q: search.q,
  }),
  loader: async ({ params, context, deps }) => {
    // Prefetch conversations with URL params
    prefetchInboxConversations(context.queryClient, params.workspaceSlug, {
      page: 1,
      pageSize: 25,
      channel: deps.channel !== "all" ? deps.channel : undefined,
      platform: deps.platform !== "all" ? deps.platform : undefined,
      q: deps.q,
    });
  },
  component: InboxList,
  pendingComponent: InboxPendingComponent,
});
