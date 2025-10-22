import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettings } from "@/components/workspace/workspace-settings";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/settings",
)({
  component: WorkspaceSettings,
});
