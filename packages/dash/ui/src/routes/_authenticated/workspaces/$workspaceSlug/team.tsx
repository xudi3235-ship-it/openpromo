import { createFileRoute } from "@tanstack/react-router";
import { TeamManagement } from "@/components/workspace/team-management";
import { prefetchWorkspaceMembers } from "@/queries/workspace";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/team",
)({
  loader: ({ params, context }) => {
    prefetchWorkspaceMembers(context.queryClient, params.workspaceSlug);
  },
  component: TeamManagement,
});
