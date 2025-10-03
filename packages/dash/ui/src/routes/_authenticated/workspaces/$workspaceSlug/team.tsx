import { createFileRoute } from "@tanstack/react-router";
import { TeamManagement } from "@/components/workspace/team-management";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/team",
)({
  component: function WorkspaceTeamRoute() {
    return (
      <div className="h-full w-full p-4">
        <TeamManagement />
      </div>
    );
  },
});
