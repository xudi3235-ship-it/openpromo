import { createFileRoute } from "@tanstack/react-router";
import { ContentListPage } from "@/components/content/ContentListPage";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content",
)({
  component: ContentListPage,
});
