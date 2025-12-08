import { createFileRoute } from "@tanstack/react-router";
import { ContentDetailPage } from "@/components/content/content-detail-page";
import { prefetchContentDetail } from "@/queries/content-orpc";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content/$contentId",
)({
  loader: async ({ params, context }) => {
    if (!params.contentId) {
      return;
    }

    prefetchContentDetail(
      context.queryClient,
      params.workspaceSlug,
      params.contentId,
    );
  },
  component: ContentDetailPage,
});
