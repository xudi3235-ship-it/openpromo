import { createFileRoute } from "@tanstack/react-router";
import {
  StyleDetailPage,
  StyleDetailSkeleton,
} from "@/components/styles/style-detail-page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/styles/$styleId",
)({
  component: StyleDetailPage,
  pendingComponent: StyleDetailSkeleton,
});
