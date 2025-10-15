import { createFileRoute } from "@tanstack/react-router";
import { ContentListPage } from "@/components/content/ContentListPage";
import { prefetchContentList } from "@/queries/content";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content",
)({
  loader: ({ params, context }) => {
    // Prefetch content list with default params to avoid query waterfall
    prefetchContentList(context.queryClient, params.workspaceSlug);
  },
  component: ContentListPage,
});
