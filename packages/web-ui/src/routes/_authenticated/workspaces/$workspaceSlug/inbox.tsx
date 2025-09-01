import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/workspaces/$workspaceSlug/inbox"!</div>;
}
