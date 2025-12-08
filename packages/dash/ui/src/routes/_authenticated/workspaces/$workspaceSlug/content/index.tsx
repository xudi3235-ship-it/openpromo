import { createFileRoute } from "@tanstack/react-router";
import { ContentListPage } from "@/components/content/ContentListPage";
import { prefetchContentList } from "@/queries/content-orpc";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content/",
)({
  loader: async ({ params, context }) => {
    prefetchContentList(context.queryClient, params.workspaceSlug);
  },
  component: ContentListPage,
});
