import { createFileRoute } from "@tanstack/react-router";
import { StyleListPage } from "@/components/styles/StyleListPage";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/styles/",
)({
  component: StyleListPage,
});
