import { createFileRoute } from "@tanstack/react-router";
import { StylesPage } from "@/components/styles/page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/styles/",
)({
  component: StylesPage,
});
