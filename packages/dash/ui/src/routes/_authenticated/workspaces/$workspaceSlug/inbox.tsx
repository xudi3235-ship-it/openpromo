import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "@/components/inbox";
import { prefetchInboxConversations } from "@/queries/inbox/conversations";

// Search params schema for inbox filters and state
type InboxSearchParams = {
  channel?: "all" | "dm" | "post_comment";
  platform?: "all" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  conversationId?: string;
  highlightMessageId?: string;
  q?: string;
};

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox",
)({
  validateSearch: (search: Record<string, unknown>): InboxSearchParams => {
    return {
      channel:
        (search.channel as string) === "dm" ||
        (search.channel as string) === "post_comment"
          ? (search.channel as "dm" | "post_comment")
          : "all",
      platform: ["FACEBOOK", "INSTAGRAM", "TIKTOK"].includes(
        search.platform as string,
      )
        ? (search.platform as "FACEBOOK" | "INSTAGRAM" | "TIKTOK")
        : "all",
      conversationId:
        typeof search.conversationId === "string"
          ? search.conversationId
          : undefined,
      highlightMessageId:
        typeof search.highlightMessageId === "string"
          ? search.highlightMessageId
          : undefined,
      q: typeof search.q === "string" ? search.q : undefined,
    };
  },
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
  component: Inbox,
});
