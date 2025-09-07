import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/workspaces/$workspaceSlug/content"!</div>;
}
