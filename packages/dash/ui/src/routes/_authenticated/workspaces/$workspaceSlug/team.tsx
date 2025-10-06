import { createFileRoute } from "@tanstack/react-router";
import { TeamManagement } from "@/components/workspace/team-management";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/team",
)({
  component: TeamManagement,
});
