import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/workspaces/$workspaceId")(
  {
    component: WorkspaceComponent,
  },
);

function WorkspaceComponent() {
  return <div>Workspace Content</div>;
}
