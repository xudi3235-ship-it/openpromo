import { createFileRoute } from "@tanstack/react-router";
import {
  StyleDetailPage,
  StyleDetailSkeleton,
} from "@/components/styles/style-detail-page";
import {
  prefetchStyleDetails,
  prefetchStyleGenerationsInfiniteQuery,
} from "@/queries/styles";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/styles/$styleId",
)({
  loader: ({ params, context }) => {
    // Prefetch style details and generations to avoid query waterfall
    prefetchStyleDetails(
      context.queryClient,
      params.workspaceSlug,
      params.styleId,
    );
    prefetchStyleGenerationsInfiniteQuery(
      context.queryClient,
      params.workspaceSlug,
      params.styleId,
    );
  },
  component: StyleDetailPage,
  pendingComponent: StyleDetailSkeleton,
});
