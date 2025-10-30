import { createFileRoute } from "@tanstack/react-router";
import { InboxLayout } from "@/components/inbox/inbox-layout";

// Search params schema for inbox filters
type InboxSearchParams = {
  channel?: "all" | "dm" | "post_comment";
  platform?: "all" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  q?: string;
  unread?: boolean;
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
      q: typeof search.q === "string" ? search.q : undefined,
      unread:
        search.unread === true || search.unread === "true" ? true : undefined,
    };
  },
  component: InboxLayout,
});
