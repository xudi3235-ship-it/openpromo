import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  return <div>workspace Index</div>;
}
